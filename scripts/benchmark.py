import sys,importlib.util,time,threading,json,csv,platform,hashlib
from pathlib import Path
from contextlib import redirect_stdout
import io
BASE=Path(__file__).resolve().parents[1];sys.path.insert(0,str(BASE/'build/python-packages'))
import psutil
spec=importlib.util.spec_from_file_location('worker',BASE/'src/audit-worker/worker.py');w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
root=BASE/'artifacts/benchmarks'/time.strftime('%Y%m%d-%H%M%S');root.mkdir(parents=True)
n=int(sys.argv[1]) if len(sys.argv)>1 else 100000
header=['主体','日期','凭证','科目','借方','贷方']
with (root/'a.csv').open('w',encoding='utf-8-sig',newline='') as a,(root/'b.csv').open('w',encoding='utf-8-sig',newline='') as b:
 wa,wb=csv.writer(a),csv.writer(b);wa.writerow(header);wb.writerow(header)
 for i in range(n):
  writer=wa if i%2==0 else wb;writer.writerow(['A','2026-02-01',f'{i//2:08d}','1002' if i%2==0 else '6001','0.10' if i%2==0 else '0','0' if i%2==0 else '0.10'])
peak=[0];stop=threading.Event()
def monitor():
 while not stop.wait(.025):peak[0]=max(peak[0],psutil.Process().memory_info().rss)
threading.Thread(target=monitor,daemon=True).start();reports=[]
for mode in ['local-light','local-batch']:
 start=time.perf_counter()
 req={'protocolVersion':1,'taskId':mode,'root':str(root),'tool':'voucher_check','files':['a.csv','b.csv'],'mode':mode,'parameters':{'keys':'主体,日期,凭证','debit':'借方','credit':'贷方','tolerance':'0.01'},'limits':{'memoryMiB':2048,'threads':2}}
 with redirect_stdout(io.StringIO()):r=w.run(req)
 assert r['rowCount']==0 and r['inputRows']==n
 reports.append({'mode':mode,'selectedMode':r['mode'],'rows':r['inputRows'],'differences':r['rowCount'],'seconds':round(time.perf_counter()-start,3)})
stop.set();out={'datasetRows':n,'inputHashes':[w.digest(root/f) for f in ['a.csv','b.csv']],'checks':reports,'peakProcessRSSMiB':round(peak[0]/1024**2,1),'os':platform.platform(),'python':platform.python_version(),'cpuCount':psutil.cpu_count(),'physicalRAMGiB':round(psutil.virtual_memory().total/1024**3,1),'scope':'窄表跨文件凭证汇总单场景；不是全部工具的容量保证，也未测试百万/千万行'}
(BASE/'artifacts/test-results/benchmark.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(out,ensure_ascii=False))
