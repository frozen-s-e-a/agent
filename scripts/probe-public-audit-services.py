"""Read-only probes of official public data endpoints; no user credentials."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
import json,time
from runtime.transport import Session

out=Path('artifacts/independent-live-validation/public-services');out.mkdir(parents=True,exist_ok=True)
cases=[
 ('ipo_sz','GET','https://listing.szse.cn/api/ras/projectrends/query',{'params':{'bizType':'1','pageIndex':'0','pageSize':'20'}}),
 ('ipo_sh','GET','https://query.sse.com.cn/commonSoaQuery.do',{'params':{'jsonCallBack':'jsonpCallback'+str(int(time.time()*1000)),'sqlId':'SH_XM_LB','issueMarketType':'1,2','order':'updateDate|desc,stockAuditNum|desc','isPagination':'true','pageHelp.pageSize':'20','pageHelp.pageNo':'1'},'headers':{'Referer':'https://listing.sse.com.cn/'}}),
 ('ipo_bj','POST','https://www.bse.cn/projectNewsController/infoResult.do?callback=jQuery_1',{'data':{'page':'0','isNewThree':'1','sortfield':'updateDate','sorttype':'desc'}}),
 ('currency_history','GET','https://www.safe.gov.cn/safe/2020/1218/17833.html',{}),
 ('currency_recent','POST','https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do',{'data':{'startDate':'2026-10-01','endDate':'2026-10-10','queryYN':'true'}}),
 ('announcement_stock','GET','https://www.cninfo.com.cn/new/data/szse_stock.json',{}),
 ('announcement_query','POST','https://www.cninfo.com.cn/new/hisAnnouncement/query',{'data':{'pageNum':'1','pageSize':'1','tabName':'fulltext','column':'szse','stock':'000001,gssz0000001','category':'category_ndbg_szsh','seDate':'2026-01-01~2026-10-10','isHLtitle':'true'}})
]
def probe(case):
 name,method,url,kw=case;record={'name':name,'url':url,'time':datetime.now().isoformat()}
 try:
  response=Session().request(method,url,timeout=25,**kw);response.raise_for_status()
  (out/(name+'.txt')).write_text(response.text,encoding='utf-8')
  record.update(success=True,status=response.status_code,bytes=len(response.content),sample=response.text[:450])
 except Exception as e:record.update(success=False,error=str(e))
 print(json.dumps(record,ensure_ascii=False),flush=True);return record
with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(probe,cases))
(out/'probe-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
