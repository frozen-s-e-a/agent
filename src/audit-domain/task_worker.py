"""One process per task; line-delimited JSON compatible with the host runner."""
import json
import sys

from runtime.context import Context,plain
from runtime.registry import dispatch,verify_registry


def emit(event):
    sys.stdout.write(json.dumps(plain(event),ensure_ascii=False,allow_nan=False)+'\n')
    sys.stdout.flush()


def main():
    raw=sys.stdin.buffer.readline(12_000_001)
    if len(raw)>12_000_000:raise ValueError('任务请求过大')
    request=json.loads(raw)
    verify_registry()
    context=Context(request,emit)
    emit({'type':'progress','phase':'检查资料与业务参数'})
    try:result=dispatch(context,request['name'])
    except Exception as error:
        emit({'type':'result','result':context.result({'success':False,'status':'failed','message':str(error),'errorType':type(error).__name__})})
        return
    if not isinstance(result,dict):raise RuntimeError('任务没有返回结构化结果')
    # Only complete successes receive a publication manifest.
    if result.get('success') and result.get('status')=='success':
        context.json({'taskId':context.task_id,'status':'succeeded','tool':request['name'],'outputs':context.outputs.copy()},'manifest.json')
        result['outputs']=context.outputs
    emit({'type':'result','result':result})


if __name__=='__main__':
    try:main()
    except Exception as error:
        emit({'type':'error','message':str(error),'errorType':type(error).__name__})
        sys.exit(1)
