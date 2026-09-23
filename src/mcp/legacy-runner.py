import sys, json, os, pathlib, importlib, traceback, shutil
ROOT=pathlib.Path(__file__).resolve().parents[2]
LEGACY=pathlib.Path(os.environ.get('LEGACY_TOOLBOX',r'C:\Users\Install\Desktop\SW审计工具箱'))
sys.path[:0]=[str(ROOT/'build/python-packages'),str(LEGACY),str(LEGACY/'modules')]
def main():
 req=json.loads(sys.stdin.readline()); module=req['module']; config=req.get('config') or {}; work=pathlib.Path(req.get('workdir') or (ROOT/'build/legacy-work'));work.mkdir(parents=True,exist_ok=True)
 try:
  mod=importlib.import_module(module)
  from modules.mcp_context import MCPContext
  ctx=MCPContext(current_work_dir=str(work),current_project=str(work),settings_data=req.get('settings') or {})
  result=mod.run(ctx,config_mode='direct',config_data=config)
  if hasattr(result,'__await__'):
   import asyncio; result=asyncio.run(result)
  print(json.dumps({'ok':True,'result':result},ensure_ascii=False,default=str))
 except Exception as e:
  print(json.dumps({'ok':False,'error':f'{type(e).__name__}: {e}','trace':traceback.format_exc(limit=5)},ensure_ascii=False))
if __name__=='__main__': main()
