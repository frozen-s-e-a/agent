from collections import defaultdict
from copy import copy
from itertools import combinations
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import re

import pandas as pd
from openpyxl import load_workbook
from openpyxl.formula.translate import Translator
from openpyxl.utils import column_index_from_string

from recovered.bank_helpers import similarity as compute_similarity
from recovered.bank_helpers import format_date
from recovered.kernels import clean_bank_name
from .context import split, number, EXCEL, safe_name
from .workbook_tasks import workbook


def merge_flows(ctx):
    a=ctx.args;files=a['file_paths'];frames=[]
    lists=[k for k,v in a.items() if isinstance(v,list)]
    if any(len(a[k])!=len(files) for k in lists):raise ValueError('每项流水配置必须与文件逐一对应')
    columns={'transaction_date_cols':'交易日期','transaction_time_cols':'交易时间','counterparty_name_cols':'对方户名',
             'counterparty_account_cols':'对方账号','summary_cols':'摘要','income_cols':'收入金额','expense_cols':'支出金额','balance_cols':'余额'}
    for i,p in enumerate(files):
        df=ctx.table(p,header=int(a['header_start_rows'][i]),dtype=str)
        start=column_index_from_string(a['header_start_cols'][i].upper())-1
        df=df.iloc[:,start:]
        ctx.require(df,[a[k][i] for k in columns if a[k][i]])
        result=pd.DataFrame(index=df.index)
        for key,col in columns.items():result[col]=df[a[key][i]] if a[key][i] else ''
        for key,col in [('bank_names','银行名称'),('account_names','银行户名'),('account_numbers','银行账号')]:result[col]=str(a[key][i])
        for col in ['收入金额','支出金额','余额']:result[col]=number(result[col])
        result['来源文件']=str(ctx.path(p,True).relative_to(ctx.root));result['来源行']=range(int(a['header_start_rows'][i])+1,int(a['header_start_rows'][i])+1+len(result))
        frames.append(result)
    df=pd.concat(frames,ignore_index=True);ctx.report(df,'银行流水合并.xlsx');return ctx.result(frame=df)


def cents(value):
    return int((Decimal(str(value))*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))


def gl_records(gl,a,dates,mask,debit,credit,direct,partner_cols):
    """Allocate bank lines to counterparties while preserving both amounts.

    Exact counterpart lines and subsets are consumed first. The remainder is
    allocated by counterpart amounts, with the final cent carried to the last
    row. Separate split IDs prevent one portion from consuming the whole line.
    """
    records=[]
    def partner(row):
        return '；'.join(dict.fromkeys(str(row[c]).strip() for c in partner_cols if pd.notna(row[c]) and str(row[c]).strip()))
    keys=[a['gl_voucher_col']]
    if a.get('gl_company_col'):keys.append(a['gl_company_col'])
    grouped=gl.assign(_voucher_date=dates).groupby(keys+['_voucher_date'],dropna=False,sort=False)
    for _,voucher in grouped:
        targets=voucher[mask.loc[voucher.index]]
        if targets.empty:continue
        counters=[{'index':i,'amount':cents(credit[i]-debit[i]),'partner':partner(r)} for i,r in voucher[~mask.loc[voucher.index]].iterrows()]
        remaining={c['index']:abs(c['amount']) for c in counters}
        for i,row in targets.iterrows():
            amount=cents(debit[i]-credit[i]);choices=[]
            if direct:
                choices=[(str(row[direct]).strip() if pd.notna(row[direct]) else '',abs(amount))]
            elif amount:
                eligible=[{**c,'amount':remaining[c['index']]} for c in counters if c['amount']*amount>0 and remaining[c['index']]>0]
                exact=next((c for c in eligible if c['amount']==abs(amount)),None)
                selected=[exact] if exact else subset(eligible,abs(amount))
                if selected:
                    for c in selected:
                        choices.append((c['partner'],c['amount']));remaining[c['index']]=0
                else:
                    choices=[(c['partner'],c['amount']) for c in eligible]
            weights=defaultdict(int)
            for name,weight in choices:weights[name]+=weight
            if not weights:weights['']=abs(amount) or 1
            weights_total=sum(weights.values());items=list(weights.items())
            allocated_debit=allocated_credit=0
            original_debit,original_credit=cents(debit[i]),cents(credit[i])
            for part,(name,weight) in enumerate(items):
                if part==len(items)-1:
                    d=original_debit-allocated_debit;c=original_credit-allocated_credit
                else:
                    d=int((Decimal(original_debit)*weight/weights_total).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
                    c=int((Decimal(original_credit)*weight/weights_total).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
                allocated_debit+=d;allocated_credit+=c
                output=row.drop(labels=['_voucher_date'],errors='ignore').to_dict()
                output[a['gl_debit_col']]=d/100;output[a['gl_credit_col']]=c/100
                records.append({'index':len(records),'source_index':i,'amount':d-c,'date':dates[i],'month':dates[i].strftime('%Y-%m'),
                    'partner':clean_bank_name(name),'summary':str(row[a['gl_summary_col']]) if pd.notna(row[a['gl_summary_col']]) else '',
                    'split_status':'已拆分' if len(items)>1 else '未拆分','row':output})
    return records


def subset(rows,target,cap=6):
    rows=list(rows)
    if len(rows)>22:return None
    for count in range(2,min(cap,len(rows))+1):
        for group in combinations(rows,count):
            if sum(r['amount'] for r in group)==target:return list(group)
    return None


def available(items,used):return [r for r in items if r['index'] not in used]


def match_records(gs,bs,ctx):
    used_g=set();used_b=set();matches=[]
    def available(items,used):return [r for r in items if r['index'] not in used]
    def mark(b,g,level,score=None):
        used_b.update(r['index'] for r in b);used_g.update(r['index'] for r in g)
        matches.append({'id':len(matches)+1,'bank':b,'gl':g,'level':level,'score':score})
    def exact(label,condition,cross=False):
        for g in available(gs,used_g):
            candidates=[b for b in available(bs,used_b) if b['amount']==g['amount'] and (abs((b['date']-g['date']).days)<=3 if cross else b['month']==g['month']) and condition(b,g)]
            if candidates:mark([min(candidates,key=lambda b:(abs((b['date']-g['date']).days),b['index']))],[g],label)
    exact('L1:交易对手-精准',lambda b,g:bool(g['partner']) and b['partner']==g['partner'])
    exact('L2:摘要-精准',lambda b,g:bool(b['partner']) and b['partner'] in clean_bank_name(g['summary']))
    for g in available(gs,used_g):
        candidates=[b for b in available(bs,used_b) if g['partner'] and b['partner']==g['partner'] and b['month']==g['month'] and b['amount']*g['amount']>0]
        group=subset(candidates,g['amount'])
        if group:mark(group,[g],'L3:同客商-定向凑数')
    for day,partner in dict.fromkeys((g['date'],g['partner']) for g in available(gs,used_g) if g['partner']):
        bg=[b for b in available(bs,used_b) if b['date']==day and b['partner']==partner]
        gg=[g for g in available(gs,used_g) if g['date']==day and g['partner']==partner]
        if bg and gg and sum(r['amount'] for r in bg)==sum(r['amount'] for r in gg):mark(bg,gg,'L4:同客商-汇总')
    for month,partner,sign in dict.fromkeys((g['month'],g['partner'],1 if g['amount']>0 else -1) for g in available(gs,used_g) if g['partner'] and g['amount']):
        bg=[b for b in available(bs,used_b) if b['month']==month and b['partner']==partner and b['amount']*sign>0]
        gg=[g for g in available(gs,used_g) if g['month']==month and g['partner']==partner and g['amount']*sign>0]
        if bg and gg and sum(r['amount'] for r in bg)==sum(r['amount'] for r in gg):mark(bg,gg,'L4:同月同客商-多对多汇总')
    for g in available(gs,used_g):
        candidates=[(compute_similarity(b['partner'],g['partner']),b) for b in available(bs,used_b) if b['month']==g['month'] and b['amount']==g['amount'] and b['partner'] and g['partner']]
        if candidates:
            score,b=max(candidates,key=lambda x:(x[0],-abs((x[1]['date']-g['date']).days),-x[1]['index']))
            if score>=.85:mark([b],[g],'L5:客商相似',score)
    for b in available(bs,used_b):
        candidates=[g for g in available(gs,used_g) if b['month']==g['month'] and b['amount']==g['amount']]
        reverse=[x for x in available(bs,used_b) if x['month']==b['month'] and x['amount']==b['amount']]
        if len(candidates)==len(reverse)==1:mark([b],candidates,'L6:同月金额-独一')
    for window,label in [(0,'同日'),(3,'3日内'),(31,'同月')]:
        for b in available(bs,used_b):
            candidates=[g for g in available(gs,used_g) if b['month']==g['month'] and abs((b['date']-g['date']).days)<=window and b['partner'] and g['partner']==b['partner'] and b['amount']*g['amount']>0]
            group=subset(candidates,b['amount'])
            if group:mark([b],group,'L7:同客商-汇总('+label+')')
    for b in available(bs,used_b):
        candidates=[g for g in available(gs,used_g) if b['month']==g['month'] and b['amount']*g['amount']>0]
        if len(candidates)>22:ctx.warnings.append('部分月份的组合搜索候选超过 22 笔；未执行该组合搜索。')
        group=subset(candidates,b['amount'])
        if group:mark([b],group,'L8:同月金额-凑数')
    for g in available(gs,used_g):
        group=subset([b for b in available(bs,used_b) if b['month']==g['month'] and b['amount']*g['amount']>0],g['amount'])
        if group:mark(group,[g],'L8:反向同月金额-凑数')
    exact('L9:跨月-交易对手',lambda b,g:b['month']!=g['month'] and b['partner'] and b['partner']==g['partner'],True)
    exact('L9:跨月-摘要',lambda b,g:b['month']!=g['month'] and b['partner'] and b['partner'] in clean_bank_name(g['summary']),True)
    for g in available(gs,used_g):
        candidates=[b for b in available(bs,used_b) if abs((b['date']-g['date']).days)<=3 and b['amount']*g['amount']>0 and b['partner'] and b['partner']==g['partner']]
        group=subset(candidates,g['amount'])
        if group and any(b['month']!=g['month'] for b in group):mark(group,[g],'L9:跨月-同客商凑数')
    for b in available(bs,used_b):
        candidates=[g for g in available(gs,used_g) if abs((b['date']-g['date']).days)<=3 and b['amount']*g['amount']>0 and b['partner'] and b['partner']==g['partner']]
        group=subset(candidates,b['amount'])
        if group and any(g['month']!=b['month'] for g in group):mark([b],group,'L9:跨月-同客商汇总')
    return matches,used_g,used_b


def reconciliation(ctx):
    a=dict(ctx.args)
    gl=ctx.table(a['gl_path'],dtype=str);bank=ctx.table(a['bank_path'],dtype=str)
    pairs=[('company',['公司名称','公司','主体'],['公司名称','公司','主体']),('account',['银行账号','银行账户','银行账户号','银行存款账号'],['银行账号','银行账户','银行账户号','账号'])]
    for kind,gcandidates,bcandidates in pairs:
        gc=a.get('gl_'+kind+'_col') or next((c for c in gcandidates if c in gl),None)
        bc=a.get('bank_'+kind+'_col') or next((c for c in bcandidates if c in bank),None)
        if gc:ctx.require(gl,[gc])
        if bc:ctx.require(bank,[bc])
        if gc and bc:
            ctx.require(gl,[gc]);ctx.require(bank,[bc]);a['gl_'+kind+'_col']=gc;a['bank_'+kind+'_col']=bc
        elif (gc and gl[gc].nunique()>1) or (bc and bank[bc].nunique()>1) or a.get('gl_'+kind+'_col') or a.get('bank_'+kind+'_col'):
            raise ValueError('多公司或多账户核对须同时指定序时账和流水的'+('公司' if kind=='company' else '银行账号')+'列')
        else:a.pop('gl_'+kind+'_col',None);a.pop('bank_'+kind+'_col',None)
    gkeys=['gl_date_col','gl_voucher_col','gl_subject_col','gl_summary_col','gl_debit_col','gl_credit_col']
    bkeys=['bank_date_col','bank_income_col','bank_expense_col','bank_partner_col']
    ctx.require(gl,[a[k] for k in gkeys]);ctx.require(bank,[a[k] for k in bkeys])
    gdates=pd.to_datetime(gl[a['gl_date_col']].map(format_date),errors='coerce');bdates=pd.to_datetime(bank[a['bank_date_col']].map(format_date),errors='coerce')
    if gdates.isna().any() or bdates.isna().any():raise ValueError('序时账或流水存在无法识别的交易日期')
    subjects=split(a['gl_bank_subject']);mask=gl[a['gl_subject_col']].fillna('').astype(str).isin(subjects)
    if not mask.any():raise ValueError('没有找到配置的银行科目值')
    direct=a.get('gl_partner_direct_col');partner_cols=split(a.get('gl_partner_col'))
    if direct:ctx.require(gl,[direct])
    elif partner_cols:ctx.require(gl,partner_cols)
    else:raise ValueError('请选择交易对手列或客商辅助项列')
    bs=[]
    debit,credit=number(gl[a['gl_debit_col']]),number(gl[a['gl_credit_col']])
    gs=gl_records(gl,a,gdates,mask,debit,credit,direct,partner_cols)
    for g in gs:g['scope']=tuple(str(g['row'].get(a['gl_'+kind+'_col'],'') or '') for kind,_,_ in pairs if a.get('gl_'+kind+'_col'))
    income,expense=number(bank[a['bank_income_col']]),number(bank[a['bank_expense_col']])
    for i,row in bank.iterrows():
        date=bdates[i];partner=str(row[a['bank_partner_col']]) if pd.notna(row[a['bank_partner_col']]) else ''
        bs.append({'index':i,'amount':cents(income[i]-expense[i]),'date':date,'month':date.strftime('%Y-%m'),'partner':clean_bank_name(partner),'row':row.to_dict()})
        bs[-1]['scope']=tuple(str(row[a['bank_'+kind+'_col']] or '') for kind,_,_ in pairs if a.get('bank_'+kind+'_col'))
    matches=[];used_g=set();used_b=set()
    scopes=set(r.get('scope',()) for r in gs+bs)
    for scope in sorted(scopes):
        hits,gids,bids=match_records([r for r in gs if r.get('scope',())==scope],[r for r in bs if r.get('scope',())==scope],ctx)
        used_g.update(gids);used_b.update(bids);matches.extend(hits)
    for index,hit in enumerate(matches,1):hit['id']=index
    detail=[]
    for match in matches:
        for b,g in zip_longest(match['bank'],match['gl']):
            row={'匹配编号':match['id'],'匹配规则':match['level'],'匹配组差额':(sum(x['amount'] for x in match['bank'])-sum(x['amount'] for x in match['gl']))/100,
                 '文本相似度':match['score'],'复核状态':'待复核'}
            if b:row.update({'流水_'+k:v for k,v in b['row'].items()});row['流水来源行']=b['index']+2
            if g:
                row.update({'序时账_'+k:v for k,v in g['row'].items()});row['序时账来源行']=g['source_index']+2
                row['序时账拆分状态']=g['split_status'];row['核对交易对手']=g['partner'];row['序时账核对金额']=g['amount']/100
            detail.append(row)
    unbank=pd.DataFrame([{**r['row'],'流水来源行':r['index']+2} for r in available(bs,used_b)])
    ungl=pd.DataFrame([{**r['row'],'序时账来源行':r['source_index']+2,'核对交易对手':r['partner'],'拆分状态':r['split_status']} for r in available(gs,used_g)])
    summary=pd.DataFrame([{'方向':'银行流水','总体笔数':len(bs),'匹配笔数':len(used_b),'未匹配笔数':len(bs)-len(used_b),'总体绝对金额':sum(abs(r['amount']) for r in bs)/100,'匹配绝对金额':sum(abs(r['amount']) for r in bs if r['index'] in used_b)/100},
                          {'方向':'序时账银行科目','总体笔数':len(gs),'匹配笔数':len(used_g),'未匹配笔数':len(gs)-len(used_g),'总体绝对金额':sum(abs(r['amount']) for r in gs)/100,'匹配绝对金额':sum(abs(r['amount']) for r in gs if r['index'] in used_g)/100}])
    summary['笔数匹配率']=summary['匹配笔数']/summary['总体笔数'].replace(0,float('nan'))
    summary['金额匹配率']=summary['匹配绝对金额']/summary['总体绝对金额'].replace(0,float('nan'))
    ctx.report({'核对汇总':summary,'匹配明细':pd.DataFrame(detail),'流水未匹配':unbank,'序时账未匹配':ungl},'银行流水双向核对.xlsx')
    ctx.warnings.append('金额及文本匹配属于核对线索，不能替代原始凭证复核。')
    return ctx.result({'matched_groups':len(matches)},summary)


def zip_longest(left,right):
    from itertools import zip_longest as zipper
    return zipper(left,right)


def code_row(ws):
    for r in range(1,min(10,ws.max_row)+1):
        if any(str(c.value).startswith(('TEMPORARYCODE','SCCBA','GROUP0','SCDOC')) for c in ws[r]):
            return r,[str(c.value or '').strip() for c in ws[r]]
    return None,[]


def confirmation(ctx,name):
    cfg=ctx.config();kind={'bank_digit2':'电子格式二','bank_paper1':'纸质格式一','bank_paper2':'纸质格式二'}[name]
    template=Path(__file__).resolve().parents[2]/'resources'/'templates'/('询证函模板-'+kind+'.xlsx')
    if not template.exists():raise FileNotFoundError('程序包缺少函证输出模板')
    # Source formula cells must carry cached values; preserve formulas in copied
    # configuration rather than pretending that openpyxl recalculates them.
    fmt=load_workbook(ctx.path(ctx.args['config_file'],True),data_only=False)
    for ws in fmt:
        for row in ws:
            for cell in row:
                if cell.data_type=='f' and cfg[ws.title][cell.coordinate].value is None:
                    raise ValueError('配置公式没有已保存的计算结果: '+ws.title+'!'+cell.coordinate+'；请在 Excel 中重算并保存，或填写数值')
    data={};ids=set();fixed={}
    for ws in cfg:
        r,columns=code_row(ws)
        if not r:continue
        records=[]
        for values in list(ws.values)[r:]:
            if not any(v is not None for v in values):continue
            records.append(dict(zip(columns,values)))
        if '固定信息' in ws.title:fixed[ws.title.split('-')[0]]=records;continue
        for record in records:
            key=record.get('TEMPORARYCODE')
            if key is not None and str(key).strip():ids.add(str(key))
        data.setdefault(ws.title.split('-')[0],[]).append(records)
    if not ids:raise ValueError('配置表没有有效的 TEMPORARYCODE 编号和函证信息')
    wb=workbook(template);counts=[]
    for ws in wb:
        r,columns=code_row(ws)
        if not r:continue
        # Clear example data beneath identifier row, keeping cell styles.
        for row in ws.iter_rows(min_row=r+1):
            for cell in row:
                if cell.__class__.__name__!='MergedCell':cell.value=None
        current=r+1
        chunks=data.get(ws.title,[])
        for ident in sorted(ids):
            selected_chunks=[[v for v in records if str(v.get('TEMPORARYCODE',''))==ident] for records in chunks]
            selected=[]
            for index in range(max((len(chunk) for chunk in selected_chunks),default=1)):
                combined={'TEMPORARYCODE':ident}
                for chunk in selected_chunks:
                    if index<len(chunk):combined.update(chunk[index])
                selected.append(combined)
            defaults=fixed.get(ws.title,[])
            if not selected:selected=[{'TEMPORARYCODE':ident}]
            if defaults:
                selected=[{**base,**{k:v for k,v in fixedrow.items() if v is not None},'TEMPORARYCODE':ident} for base in selected for fixedrow in defaults]
            for record in selected:
                for i,col in enumerate(columns,1):
                    if not col:continue
                    cell=ws.cell(current,i);value=record.get(col)
                    if value is not None:cell.value=value
                    if current>r+1:cell._style=copy(ws.cell(r+1,i)._style)
                current+=1
        counts.append({'函证格式':kind,'工作表':ws.title,'编号数量':len(ids),'生成行数':current-r-1})
    if wb.calculation:wb.calculation.fullCalcOnLoad=True
    destination=ctx.destination('银行函证-'+kind+'.xlsx');wb.save(destination);wb.close();fmt.close();ctx.register(destination)
    ctx.report(pd.DataFrame(counts),'银行函证生成清单.xlsx')
    return ctx.result({'confirmation_count':len(ids)},pd.DataFrame(counts))


TASKS={'bankflowmerge':merge_flows,'bank_flow':reconciliation,**{n:(lambda c,n=n:confirmation(c,n)) for n in ['bank_digit2','bank_paper1','bank_paper2']}}
