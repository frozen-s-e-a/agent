"""审计工具 MCP 服务（audit-tools/1）。

标准输入输出上的 MCP 服务器，供 DeepSeek Harness 的 dsh-mcp-client 挂载。只用标准库，
随应用内置的 Python 直接运行，不需要安装 mcp 包。

- 底稿任务的新工具（《接口约定》第三节）在 audit_tools 包里，在本进程内执行：编号、结构图和
  分析库放在项目状态目录（AUDIT_STATE_DIR），服务重启后仍然有效。
- 旧工具清单来自 src/resources/audit-task-tools.json，每次调用启动一个 task_worker.py 进程执行，
  沿用现有的项目目录限制、输出目录和结果清单。
- 每个结果都按《接口约定》2.4 包成信封 {ok, data, warnings, refs, truncated, next}，
  返回给模型的文字按 2.5 控制在约 2,000 token 以内。
- 一个服务进程只服务一个项目：项目目录由 AUDIT_PROJECT_ROOT 指定，工具不能访问它以外的文件。
- 内网版本默认不提供联网工具（公告、IPO、注协查询、汇率），子进程也以 network_disabled 运行；
  需要调用模型的工具只连 AUDIT_LLM_BASE_URL。
"""
import json
import os
import subprocess
import sys
import threading
import uuid
from pathlib import Path

SERVER_NAME = 'audit-tools'
SERVER_VERSION = '0.1.0'
INTERFACE = 'audit-tools/1'
# 由新到旧。客户端请求的版本在列表里就照用，否则回答最新的一版，由客户端决定是否继续。
PROTOCOL_VERSIONS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

HERE = Path(__file__).resolve().parent
DOMAIN = HERE.parent / 'audit-domain'
CONTRACTS = HERE.parent / 'resources' / 'audit-task-tools.json'
NETWORK_TOOLS = {'ipo_sh', 'ipo_sz', 'ipo_bj', 'currency', 'announcement', 'cicpa_query'}
# 约 2,000 token；中文按每字约 1 token 估算，留出信封本身的余量。
TEXT_BUDGET = 6000
LIST_HEAD = 20
STRING_HEAD = 400


def env_list(name):
    return {item.strip() for item in os.environ.get(name, '').split(',') if item.strip()}


def new_tools():
    """audit_tools 包；依赖（duckdb、openpyxl）缺失时只提供旧工具。"""
    try:
        import audit_tools
        return audit_tools
    except ImportError as error:
        sys.stderr.write('audit_tools 不可用：%s\n' % error)
        return None


def load_tools():
    contracts = json.loads(CONTRACTS.read_text(encoding='utf-8-sig'))
    allow, deny = env_list('AUDIT_MCP_TOOLS'), env_list('AUDIT_MCP_DENY')
    if os.environ.get('AUDIT_MCP_ALLOW_NETWORK') != '1':
        deny |= NETWORK_TOOLS
    package = new_tools()
    tools = [tool for tool in (package.listing() if package else []) if not (allow and tool['name'] not in allow) and tool['name'] not in deny]
    for item in contracts:
        name = item['name']
        if (allow and name not in allow) or name in deny:
            continue
        tools.append({
            'name': name,
            'description': item.get('description', ''),
            'inputSchema': item['inputSchema'],
            # 现有工具只读用户原文件、只往项目的 outputs 目录写新文件。
            'annotations': {'readOnlyHint': False, 'destructiveHint': False, 'idempotentHint': False, 'openWorldHint': False},
        })
    return tools


def model_settings():
    settings = {'network_disabled': True}
    for key, var in [('base_url', 'AUDIT_LLM_BASE_URL'), ('api_key', 'AUDIT_LLM_API_KEY'), ('model', 'AUDIT_LLM_MODEL')]:
        if os.environ.get(var):
            settings[key] = os.environ[var]
    if os.environ.get('AUDIT_LLM_CONTEXT_WINDOW'):
        settings['contextWindow'] = int(os.environ['AUDIT_LLM_CONTEXT_WINDOW'])
    return settings


def compact(value, depth=0):
    """缩小结果体量：长列表只留前几项并注明总数，长字符串截断。"""
    if isinstance(value, dict):
        return {k: compact(v, depth + 1) for k, v in value.items()}
    if isinstance(value, list):
        head = [compact(v, depth + 1) for v in value[:LIST_HEAD]]
        if len(value) > LIST_HEAD:
            head.append({'_omitted': len(value) - LIST_HEAD, '_total': len(value)})
        return head
    if isinstance(value, str) and len(value) > STRING_HEAD:
        return value[:STRING_HEAD] + '…（共 %d 字）' % len(value)
    return value


def dumps(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def envelope_from_result(result):
    outputs = [item['path'] if isinstance(item, dict) else str(item) for item in result.get('outputs') or []]
    ok = bool(result.get('success')) and result.get('status') == 'success'
    if not ok:
        return failure('TOOL_FAILED', result.get('message') or '工具没有成功完成', retryable=True, refs=outputs)
    data = {k: v for k, v in result.items() if k not in ('outputs', 'success', 'status', 'warnings', 'runtime')}
    envelope = {'ok': True, 'data': compact(data), 'warnings': result.get('warnings') or [], 'refs': outputs, 'truncated': False, 'next': None}
    if dumps(envelope) != dumps({**envelope, 'data': data}):
        envelope['truncated'] = True
    if len(dumps(envelope)) > TEXT_BUDGET:
        # 仍然超出时只保留标量字段，全量留在 outputs 里的文件中。
        envelope['data'] = {k: v for k, v in data.items() if not isinstance(v, (dict, list))}
        envelope['data']['_note'] = '结果较大，完整内容见 refs 中的文件'
        envelope['truncated'] = True
    return envelope


def failure(code, message, retryable=False, where=None, hint=None, refs=None):
    error = {'code': code, 'message': message, 'retryable': retryable}
    if where:
        error['where'] = where
    if hint:
        error['hint'] = hint
    result = {'ok': False, 'error': error}
    if refs:
        result['refs'] = refs
    return result


ERROR_CODES = {
    'ValueError': ('ARG_INVALID', True),
    'KeyError': ('ARG_MISSING', True),
    'FileNotFoundError': ('IO_NOT_FOUND', True),
    'PermissionError': ('IO_PERMISSION', False),
}


class Server:
    def __init__(self, stdin, stdout):
        self.stdin, self.stdout = stdin, stdout
        self.lock = threading.Lock()
        self.running = {}
        self.calls = []
        self.tools = {tool['name']: tool for tool in load_tools()}
        self.package = new_tools()
        root = os.environ.get('AUDIT_PROJECT_ROOT')
        self.root = Path(root).resolve() if root else None

    def send(self, message):
        with self.lock:
            self.stdout.write(dumps(message) + '\n')
            self.stdout.flush()

    def reply(self, rid, result=None, error=None):
        message = {'jsonrpc': '2.0', 'id': rid}
        if error is not None:
            message['error'] = error
        else:
            message['result'] = result
        self.send(message)

    def serve(self):
        for line in self.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                message = json.loads(line)
            except ValueError:
                continue
            method, rid = message.get('method'), message.get('id')
            params = message.get('params') or {}
            if method is None:
                continue
            if method == 'tools/call' and rid is not None:
                thread = threading.Thread(target=self.call, args=(rid, params), daemon=True)
                thread.start()
                self.calls.append(thread)
                continue
            try:
                result = self.handle(method, params)
            except Exception as error:
                if rid is not None:
                    self.reply(rid, error={'code': -32603, 'message': str(error)})
                continue
            if rid is not None:
                if result is None:
                    self.reply(rid, error={'code': -32601, 'message': 'Method not found: ' + method})
                else:
                    self.reply(rid, result)
        # 输入结束：让进行中的调用把结果写完。客户端要强行结束时会直接结束本进程。
        for thread in self.calls:
            thread.join()

    def handle(self, method, params):
        if method == 'initialize':
            requested = params.get('protocolVersion')
            version = requested if requested in PROTOCOL_VERSIONS else PROTOCOL_VERSIONS[0]
            return {
                'protocolVersion': version,
                'capabilities': {'tools': {'listChanged': False}},
                'serverInfo': {'name': SERVER_NAME, 'version': SERVER_VERSION, 'interface': INTERFACE},
                'instructions': '审计工具。参数里的路径都相对于当前项目目录；结果是统一信封，大结果只给摘要，完整内容在 refs 列出的文件里。',
            }
        if method == 'ping':
            return {}
        if method == 'tools/list':
            return {'tools': list(self.tools.values())}
        if method == 'notifications/cancelled':
            process = self.running.get(params.get('requestId'))
            if process == 'in-process':
                self.package.interrupt(self.root)
            elif process:
                process.kill()
            return None
        if method.startswith('notifications/'):
            return None
        return None

    def call(self, rid, params):
        name = params.get('name')
        token = (params.get('_meta') or {}).get('progressToken')
        if name not in self.tools:
            envelope = failure('ARG_UNKNOWN_TOOL', '未知工具：%s' % name, retryable=True)
        elif self.root is None or not self.root.is_dir():
            envelope = failure('ENV_NO_PROJECT', '没有打开项目目录（AUDIT_PROJECT_ROOT）')
        elif self.package and name in self.package.TOOLS:
            self.running[rid] = 'in-process'
            try:
                envelope = self.package.call(self.root, name, params.get('arguments') or {})
            finally:
                self.running.pop(rid, None)
        else:
            envelope = self.run_task(rid, name, params.get('arguments') or {}, token)
        text = dumps(envelope)
        self.reply(rid, {'content': [{'type': 'text', 'text': text}], 'structuredContent': envelope, 'isError': not envelope['ok']})

    def run_task(self, rid, name, arguments, token):
        request = {'name': name, 'root': str(self.root), 'taskId': 'mcp-' + uuid.uuid4().hex[:12], 'arguments': arguments, 'settings': model_settings()}
        process = subprocess.Popen(
            [sys.executable, '-X', 'utf8', '-B', str(DOMAIN / 'task_worker.py')], cwd=str(DOMAIN),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'PYTHONUTF8': '1'},
        )
        self.running[rid] = process
        try:
            process.stdin.write((dumps(request) + '\n').encode('utf-8'))
            process.stdin.close()
            result, error, step = None, None, 0
            for raw in process.stdout:
                try:
                    event = json.loads(raw.decode('utf-8'))
                except ValueError:
                    continue
                if event.get('type') == 'progress' and token is not None:
                    step += 1
                    self.send({'jsonrpc': '2.0', 'method': 'notifications/progress', 'params': {'progressToken': token, 'progress': step, 'message': event.get('phase') or event.get('message') or ''}})
                elif event.get('type') == 'result':
                    result = event.get('result')
                elif event.get('type') == 'error':
                    error = event
            code = process.wait()
            stderr = process.stderr.read().decode('utf-8', 'replace')[-2000:]
        finally:
            self.running.pop(rid, None)
        if code < 0 or (code != 0 and result is None and error is None):
            return failure('ENV_WORKER_EXIT', '工具进程异常退出（%s）' % code, hint=stderr or None)
        if error is not None:
            code_name, retryable = ERROR_CODES.get(error.get('errorType'), ('ENV_WORKER', False))
            return failure(code_name, error.get('message') or '工具执行失败', retryable=retryable)
        if not isinstance(result, dict):
            return failure('ENV_WORKER', '工具没有返回结果')
        if not result.get('success') and result.get('errorType') in ERROR_CODES:
            code_name, retryable = ERROR_CODES[result['errorType']]
            return failure(code_name, result.get('message') or '工具执行失败', retryable=retryable)
        return envelope_from_result(result)


def main():
    stdin = open(sys.stdin.fileno(), 'r', encoding='utf-8', closefd=False)
    stdout = open(sys.stdout.fileno(), 'w', encoding='utf-8', closefd=False, newline='\n')
    Server(stdin, stdout).serve()


if __name__ == '__main__':
    main()
