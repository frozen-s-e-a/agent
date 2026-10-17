import sys,json,subprocess,os,hashlib,time,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source=Path(sys.argv[1]);dest=ROOT/'artifacts/test-results'/('reported-workbook-'+str(int(time.time())))
dest.mkdir();copy=dest/source.name;shutil.copy2(source,copy)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=digest(source);start=time.time();request={'protocolVersion':1,'taskId':'inspect-fixed','root':str(dest),'files':[copy.name],'tool':'inspect','mode':'auto','parameters':{},'limits':{'memoryMiB':1024,'threads':2}}
r=subprocess.run([sys.executable,'-B',str(ROOT/'src/audit-worker/worker.py')],input=json.dumps(request),text=True,encoding='utf-8',capture_output=True,env={**os.environ,'PYTHONPATH':str(ROOT/'build/python-packages'),'PYTHONUTF8':'1','PYTHONIOENCODING':'utf-8'},timeout=180)
events=[json.loads(line) for line in r.stdout.splitlines()];result=next((e['result'] for e in events if e['type']=='result'),None)
if not result:raise RuntimeError(json.dumps([e for e in events if e['type']=='error'],ensure_ascii=False))
report=json.loads((Path(result['outputDir'])/'结构概览.json').read_text(encoding='utf-8'))['files'][0]
sheet=next(s for s in report['previews'] if s['sheet']=='问题')
assert any(row['row']==2 and any(c['value'] for c in row['cells']) for row in sheet['rawRows'])
assert before==digest(source)==digest(copy)
summary={'status':'passed','originalUnchanged':True,'sheetCount':report['sheetCount'],'inspectedSheets':len(report['previews']),'blankFirstRowHandled':True,'durationSeconds':round(time.time()-start,2),'result':str(Path(result['outputDir'])/'结果.xlsx')}
(dest/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))
