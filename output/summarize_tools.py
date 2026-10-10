import json,sys
from pathlib import Path
out=[]
d=json.loads(Path('src/resources/tools.json').read_text(encoding='utf-8'))
out.append('BUILTIN '+str(len(d)))
for x in d: out.append(f"{x['id']} | {x['name']} | {x['group']} | {x.get('status')}")
l=json.loads(Path('src/resources/legacy-mcp-tools.json').read_text(encoding='utf-8'))
out.append('LEGACY '+str(len(l)))
for x in l: out.append(f"{x['name']} | {x.get('description','')[:120]}")
sys.stdout.buffer.write(('\n'.join(out)).encode('utf-8'))
