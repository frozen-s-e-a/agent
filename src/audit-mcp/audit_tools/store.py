"""项目内的编号和结果（《接口约定》2.1）。

一个服务进程只服务一个项目。编号、结构图、写入计划等对象存成 JSON 文件，资料表和结果表存在
项目分析库（DuckDB）里，都放在项目的状态目录下：服务重启、Harness 续跑后，之前的编号仍然有效。

状态目录取 AUDIT_TOOLS_DIR；没有时用 AUDIT_STATE_DIR/tools（宿主按项目分目录）；
都没有时（单独测试）用项目目录下的 .audit-agent/。
"""
import json
import os
import re
import threading
from pathlib import Path

import duckdb

ID = re.compile(r'^(W|D|R|FP)-(\d{3,})$')


def state_dir(root):
    if os.environ.get('AUDIT_TOOLS_DIR'):
        return Path(os.environ['AUDIT_TOOLS_DIR'])
    if os.environ.get('AUDIT_STATE_DIR'):
        return Path(os.environ['AUDIT_STATE_DIR']) / 'tools'
    return Path(root) / '.audit-agent'


def sql_name(ref):
    """D-002 → D002：资料表和结果表在 SQL 里的表名。"""
    return ref.replace('-', '')


class Store:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.dir = state_dir(self.root)
        (self.dir / 'objects').mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.counters_file = self.dir / 'counters.json'
        self.counters = self._read(self.counters_file, {})
        # 不让查询读写文件、访问网络：资料由本服务导入，查询只读库里的表。
        self.db = duckdb.connect(str(self.dir / 'analysis.duckdb'))
        self.db.execute("SET enable_external_access = false")

    @staticmethod
    def _read(path, default):
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except FileNotFoundError:
            return default

    @staticmethod
    def _write(path, value):
        tmp = path.with_suffix(path.suffix + '.tmp')
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=1, default=str), encoding='utf-8')
        os.replace(tmp, path)

    def allocate(self, prefix):
        with self.lock:
            n = self.counters.get(prefix, 0) + 1
            self.counters[prefix] = n
            self._write(self.counters_file, self.counters)
            return '%s-%03d' % (prefix, n)

    def put(self, ref, value):
        with self.lock:
            self._write(self.dir / 'objects' / (ref.replace('#', '_') + '.json'), value)

    def get(self, ref, kind=None):
        """按编号取对象；不存在时报 REF_，让调用方修正引用。"""
        from .common import ToolError
        value = self._read(self.dir / 'objects' / (ref.replace('#', '_') + '.json'), None) if isinstance(ref, str) else None
        if value is None or (kind and value.get('kind') != kind):
            raise ToolError('REF_NOT_FOUND', '找不到 %s' % ref, hint='只能引用本项目已生成的编号')
        return value

    def exists(self, ref):
        return isinstance(ref, str) and (self.dir / 'objects' / (ref.replace('#', '_') + '.json')).is_file()

    def cursor(self):
        return self.db.cursor()

    def index(self, name):
        return self._read(self.dir / (name + '.json'), {})

    def save_index(self, name, value):
        with self.lock:
            self._write(self.dir / (name + '.json'), value)
