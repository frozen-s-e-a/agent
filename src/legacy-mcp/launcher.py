import os,sys,marshal
ROOT=os.environ.get('SW_AUDIT_TOOLBOX_ROOT',r'C:\Users\Install\Desktop\SW审计工具箱')
for p in [ROOT,os.path.join(ROOT,'_internal'),os.path.join(os.path.dirname(__file__),'vendor'),os.path.dirname(__file__)]:
    if os.path.isdir(p) and p not in sys.path: sys.path.insert(0,p)
# Reuse the original frozen MCP registry and server module in an isolated Python process.
base=os.path.dirname(__file__)
with open(os.path.join(base,'registry.bin'),'rb') as f: exec(marshal.loads(f.read()),globals())
with open(os.path.join(base,'mcp_server.bin'),'rb') as f: code=marshal.loads(f.read())
exec(code,globals(),globals())

