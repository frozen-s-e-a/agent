import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createBackend} from '../src/host/service.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export async function seedWorkbenchDemo(dataRoot){
 const projectRoot=path.join(dataRoot,'演示资料');fs.mkdirSync(projectRoot,{recursive:true});
 const python=process.env.AUDIT_PYTHON||path.join(root,'build/python/python.exe');
 if(!fs.existsSync(path.join(projectRoot,'序时账_2026.xlsx'))){
  const code=String.raw`import sys
from pathlib import Path
sys.path.insert(0,str(Path(sys.argv[2])/'build/python-packages'))
from openpyxl import Workbook
target=Path(sys.argv[1])
def save(name,headers,rows):
    w=Workbook();s=w.active;s.title='数据';s.append(headers)
    for row in rows:s.append(row)
    s.freeze_panes='A2';s.auto_filter.ref=s.dimensions
    for col in s.columns:s.column_dimensions[col[0].column_letter].width=20
    w.save(target/name)
ledger=[];bank=[]
for month in range(1,13):
    amount=280000+month*17500;date=f'2026-{month:02d}-08';voucher=f'记{month:03d}'
    ledger.extend([['演示制造有限公司',date,voucher,'1002','银行存款',amount,0,'货款回收','示例客户A','制单员A','复核员B'],['演示制造有限公司',date,voucher,'6001','主营业务收入',0,amount,'产品销售','示例客户A','制单员A','复核员B']])
    expense=8500+month*300;voucher=f'付{month:03d}'
    ledger.extend([['演示制造有限公司',date,voucher,'6602','管理费用',expense,0,'服务费用','示例供应商B','制单员A','复核员B'],['演示制造有限公司',date,voucher,'1002','银行存款',0,expense,'服务费用','示例供应商B','制单员A','复核员B']])
    bank.extend([[date,amount,0,'示例客户A','货款回收'],[date,0,expense,'示例供应商B','服务费用']])
save('序时账_2026.xlsx',['公司','凭证日期','凭证编号','科目编码','科目名称','借方金额','贷方金额','摘要','交易对手','制单人','审核人'],ledger)
save('银行流水_2026.xlsx',['交易日期','收入金额','支出金额','交易对手','摘要'],bank)
save('科目余额表_2026.xlsx',['公司','科目编码','科目名称','期初余额','本期借方','本期贷方','期末余额'],[['演示制造有限公司','1002','银行存款',500000,4725000,125400,5099600],['演示制造有限公司','6001','主营业务收入',0,0,4725000,4725000],['演示制造有限公司','6602','管理费用',0,125400,0,125400]])
save('收入成本明细_2026.xlsx',['日期','产品类别','营业收入','营业成本','数量'],[[f'2026-{m:02d}-28','示例产品A',280000+m*17500,190000+m*11800,1000+m*60] for m in range(1,13)])
save('往来余额明细_2026.xlsx',['公司','客户名称','科目名称','期末余额'],[['演示制造有限公司','示例客户A','应收账款',680000],['演示制造有限公司','示例客户B','应收账款',215000]])
`;
  const result=spawnSync(python,['-B','-c',code,projectRoot,root],{cwd:root,windowsHide:true,encoding:'utf8',timeout:30000});
  if(result.status!==0)throw Error('示例资料生成失败：'+(result.stderr||result.error?.message||''));
  fs.writeFileSync(path.join(projectRoot,'资料说明.md'),'# 项目工作台演示资料\n\n本项目的企业、交易对手和金额均为人工生成的示例，仅用于查看客户端效果。\n\n可以选择序时账执行结构检查、列提取或月间分析。银行流水和收入成本文件用于查看相应的配置界面。\n','utf8');
 }
 const backend=await createBackend({dataRoot});
 try{
  const project=backend.store.all('projects').find(p=>p.root===projectRoot)||await backend.action('project.create',{name:'华东制造 2026 年审',root:projectRoot});
  if(!backend.store.all('tasks').some(t=>t.projectId===project.id)){
   const session=await backend.action('session.create',{projectId:project.id,title:'检查序时账结构'});
   const task=await backend.action('task.run',{sessionId:session.id,tool:'inspect',files:['序时账_2026.xlsx'],parameters:{headerRow:1}});
   for(let i=0;i<200;i++){const t=backend.store.get('tasks',task.id);if(!['queued','running'].includes(t.status))break;await new Promise(r=>setTimeout(r,100));}
   const done=backend.store.get('tasks',task.id);if(done.status!=='succeeded')throw Error('示例结构检查未完成：'+(done.error||done.status));
  }
  return project;
 }finally{backend.close();}
}
