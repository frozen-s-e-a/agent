from pathlib import Path
from openpyxl import load_workbook
import json,sys,hashlib
p=Path(sys.argv[1]);w=load_workbook(p,read_only=True,data_only=True)
rows=list(w['规则筛选'].values);headers=rows[0]
rules=[{'name':str(r[1]),'enabled':r[2]=='是','conditions':{str(k):str(v) for k,v in zip(headers[3:],r[3:]) if v is not None}} for r in rows[1:] if r[1]]
features=[list(r) for r in w['特征定义'].values]
out=Path(__file__).resolve().parents[1]/'src/resources/jet-rules.json'
out.write_text(json.dumps({'source':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'status':'observed; not legacy-behavior-validated','rules':rules,'features':features},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Extracted {len(rules)} rules');w.close()
