from collections import defaultdict
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET
import zipfile

import pandas as pd

from recovered.related import RelatedPartyScanner
from recovered.kernels import normalize_company_name, extract_company_name, clean_toc_line
from .context import EXCEL, split, json_value
from .network_tasks import cicpa_session, api_data, CICPA


def company_index(data):
    result={'company_basic':{},'company_registration_status':{}}
    definitions={
        '股东信息':('company_shareholders',{'股东':'shareholder','出资比例':'ratio','认缴出资金额':'amount','股东是否是机构':'is_org'}),
        '主要人员':('company_executives',{'人物名称':'person','职务':'role','持股比例':'share_ratio','最终受益股份':'benefit_ratio'}),
        '实际控制人':('company_controllers',{'实际控制人名称':'controller','实际控制人是否机构':'is_org','持股比例':'ratio','股权链':'chain'}),
        '最终受益人':('company_beneficiaries',{'最终受益人名称':'beneficiary','受益比例':'ratio','受益类型':'type','判断理由':'reason'}),
        '参控股企业':('company_subsidiaries',{'被参控股企业名称':'subsidiary','投资比例':'ratio','经营状态':'status'}),
        '对外投资':('company_investments',{'被投资企业名称':'investee','被投资企业法人':'legal_person','注册资本':'capital','持股比例':'ratio','经营状态':'status'}),
        '变更记录':('company_changes',{'变更日期':'date','变更项目':'item','变更前':'before','变更后':'after'}),
        '法定代表人变更':('company_legal_changes',{'变更日期':'date','变更项目':'item','变更前':'before','变更后':'after'}),
        '分支机构':('company_branches',{'分支机构名称':'branch','负责人':'legal_person'})}
    for record in data.get('基础工商信息',[]):
        key=normalize_company_name(str(record.get('企业名称') or record.get('公司名称') or ''))
        if key:result['company_basic'][key]=record;result['company_registration_status'][key]=record.get('登记状态','')
    for dimension,(category,fields) in definitions.items():
        bucket=defaultdict(list)
        for row in data.get(dimension,[]):
            company=normalize_company_name(str(row.get('公司名称') or row.get('企业名称') or ''))
            if not company:continue
            entry={target:str(row.get(source) or '') for source,target in fields.items()}
            for target in ['subsidiary','investee','branch','shareholder','controller','beneficiary']:
                if target in entry:entry[target]=normalize_company_name(entry[target])
            entry['_source_file']=row.get('_source_file','');bucket[company].append(entry)
        result[category]=dict(bucket)
    return result


def load_company_data(ctx):
    data={};files=[]
    aliases={'主要人员（高管）':'主要人员','主要人员(高管)':'主要人员','工商基本信息':'基础工商信息'}
    for p in ctx.files(ctx.args['data_dir'],EXCEL):
        key=aliases.get(p.stem,p.stem)
        df=ctx.table(p,dtype=str).fillna('');records=df.to_dict('records')
        for row in records:row['_source_file']=str(p.relative_to(ctx.root))
        data.setdefault(key,[]).extend(records);files.append({'文件':str(p.relative_to(ctx.root)),'维度':key,'行数':len(df),'字段':'、'.join(df.columns)})
    if not data.get('基础工商信息'):raise ValueError('数据目录缺少基础工商信息.xlsx；请先导出并解压工商全维度数据')
    return data,files


def penetrate(ctx,names,index,threshold,depth):
    s,headers=cicpa_session(ctx);cache={};equity={}
    def fetch(org):
        if org not in cache:cache[org]=api_data(s.get(CICPA+'/open/enterprise_info_api/v3/atlas/enterprise_equity?orgid='+str(org),headers=headers,timeout=30))
        return cache[org]
    def holders(children,chain,level,visited):
        result={}
        for child in children:
            name=normalize_company_name(str(child.get('name') or child.get('company_name') or child.get('mc') or ''))
            if not name:continue
            ratio=str(child.get('czbl') or child.get('ratio') or '0').rstrip('%')
            try:value=float(ratio)
            except ValueError:value=0
            current=chain+[name];result[name]={'ratio':value,'chain':current}
            org=child.get('orgid') or child.get('org_id')
            nested=child.get('children') or []
            if level<depth and value>=threshold and name not in visited:
                if not nested and org:nested=fetch(org).get('holders',{}).get('children',[])
                result.update(holders(nested,current,level+1,visited|{name}))
        return result
    for name in names:
        key=normalize_company_name(name);basic=index['company_basic'].get(key,{})
        org=basic.get('org_id') or basic.get('orgid') or basic.get('企业org_id')
        if not org:raise ValueError('股权穿透缺少企业 org_id: '+name+'，请先查询并导出企业详情')
        raw=fetch(org);equity[key]={'holders':holders(raw.get('holders',{}).get('children',[]),[name],1,{key}),
                                  'controllers':raw.get('controllers',[]),'final_beneficiaries':raw.get('final_beneficiaries',[]),'invests':raw.get('invests',{})}
    return equity


def related(ctx):
    a=ctx.args;data,files=load_company_data(ctx);index=company_index(data)
    config=ctx.root/'input'/'关联方核查配置表.xlsx'
    if not config.exists():raise ValueError('请在 input/关联方核查配置表.xlsx 填写客户和供应商名单')
    cfg=ctx.config(str(config))
    def names(sheet):
        return [str(next(iter(row.values()))).strip() for row in ctx.rows(cfg,sheet)] if sheet in cfg else []
    customers,suppliers=names('客户名单'),names('供应商名单')
    if not customers and not suppliers:raise ValueError('客户和供应商名单为空，请先填写核查范围')
    target=normalize_company_name(a['audit_target'])
    if target not in index['company_basic']:raise ValueError('基础工商信息中没有被审计单位: '+a['audit_target'])
    equity={}
    if a.get('equity_penetration')=='是':equity=penetrate(ctx,[a['audit_target']]+customers+suppliers,index,float(a.get('threshold',50)),int(a.get('equity_depth',5)))
    scanner=RelatedPartyScanner(index,a['audit_target'],customers,suppliers,names('分子公司名单'),names('离任高管'),float(a.get('threshold',50)),equity)
    findings=scanner.run_all()
    frame=pd.DataFrame(findings,columns=['维度','置信度','被审计单位','疑似关联方','角色','关联证据','详情'])
    coverage=pd.DataFrame([{'核查企业':name,'基础工商资料':'已提供' if normalize_company_name(name) in index['company_basic'] else '缺失'} for name in [a['audit_target']]+customers+suppliers])
    missing=coverage[coverage['基础工商资料']=='缺失']
    if len(missing):ctx.warnings.append('有 '+str(len(missing))+' 家企业缺少基础工商资料；没有线索不能视为不存在关联关系。')
    ctx.report({'关联方线索':frame,'企业覆盖':coverage,'数据来源':pd.DataFrame(files)},'关联方分析报告.xlsx')
    if equity:ctx.json(equity,'股权穿透证据.json')
    return ctx.result({'finding_count':len(frame),'covered_companies':len(coverage)-len(missing),'missing_companies':missing['核查企业'].tolist()},frame)


def qcc(ctx):
    dimensions={};source=[]
    namespace={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    for p in ctx.files(ctx.args['folder_path'],{'.docx'}):
        with zipfile.ZipFile(p) as z:root=ET.fromstring(z.read('word/document.xml'))
        body=root.find('w:body',namespace);heading='未标识章节';company=extract_company_name(p.name)
        for element in body:
            if element.tag.endswith('}p'):
                text=''.join(t.text or '' for t in element.findall('.//w:t',namespace));clean=clean_toc_line(text)
                if clean and (re.match(r'^\d+(?:\.\d+)*[\s、.．]',clean) or any(k in clean for k in ['基本信息','股东信息','主要人员','对外投资','变更记录'])):
                    heading=clean[:80]
            elif element.tag.endswith('}tbl'):
                rows=[]
                for tr in element.findall('w:tr',namespace):
                    rows.append([''.join(n.text or '' for n in tc.findall('.//w:t',namespace)).strip() for tc in tr.findall('w:tc',namespace)])
                if len(rows)<2:continue
                header=rows[0]
                for row in rows[1:]:
                    record={str(k or '列'+str(i+1)):row[i] if i<len(row) else '' for i,k in enumerate(header)}
                    record.update(公司名称=company,来源文件=str(p.relative_to(ctx.root)),报告章节=heading)
                    dimensions.setdefault(heading,[]).append(record)
                source.append({'文件':p.name,'公司名称':company,'报告章节':heading,'记录数':len(rows)-1})
    if not dimensions:raise ValueError('DOCX 报告中没有找到可整理的数据表格')
    ctx.report({name:pd.DataFrame(rows) for name,rows in dimensions.items()},'企查查报告结构化数据.xlsx')
    canonical={};recognized=['法定代表人变更','实际控制人','最终受益人','股东信息','主要人员','参控股企业','对外投资','变更记录','分支机构','基础工商信息']
    aliases={'企业名称':['公司名称','名称'],'登记状态':['经营状态','企业状态'],'企业地址':['注册地址','住所','地址'],'电话':['联系电话','企业电话'],'邮箱':['电子邮箱','联系邮箱'],
             '股东':['股东名称','股东姓名','姓名'],'出资比例':['持股比例','股权比例','认缴出资比例'],'认缴出资金额':['认缴出资额','认缴金额'],
             '人物名称':['姓名','人员姓名'],'职务':['职位'],'被投资企业名称':['企业名称','公司名称','被投资企业'],'被投资企业法人':['法定代表人'],
             '变更项目':['变更事项'],'变更前':['变更前内容'],'变更后':['变更后内容']}
    for heading,rows in dimensions.items():
        title='基础工商信息' if any(v in heading for v in ['基本信息','工商信息','基础信息']) else heading
        dimension=next((v for v in recognized if v in title),None)
        if dimension is None:continue
        if dimension=='基础工商信息' and rows and any(k in rows[0] for k in ['字段','项目']):
            company=rows[0]['公司名称'];record={'企业名称':company}
            for row in rows:
                key=str(row.get('字段') or row.get('项目') or '').strip()
                value=row.get('内容',row.get('值',row.get('详情','')))
                if key:record[key]=value
            records=[record]
        else:records=[dict(r) for r in rows]
        for row in records:
            for target,candidates in aliases.items():
                if target not in row:
                    value=next((row[k] for k in candidates if row.get(k) not in [None,'']),None)
                    if value is not None:row[target]=value
            if dimension=='基础工商信息':row.setdefault('企业名称',row.get('公司名称',''))
        canonical.setdefault(dimension,[]).extend(records)
    directory=ctx.output/'工商整理';directory.mkdir()
    for dimension,records in canonical.items():
        path=ctx.report(pd.DataFrame(records),dimension+'.xlsx')
        # Expose a coherent data directory to the later related-party task.
        destination=directory/path.name;path.rename(destination)
        ctx.outputs=[x for x in ctx.outputs if x['path']!=str(path.relative_to(ctx.root))]
        ctx.register(destination)
    ctx.report(pd.DataFrame(source),'企查查提取清单.xlsx')
    if '基础工商信息' not in canonical:ctx.warnings.append('报告未识别到基础工商信息；原始章节表已保留，请补齐工商资料后再执行关联方分析。')
    return ctx.result({'dimension_count':len(dimensions),'data_dir':str(directory.relative_to(ctx.root)),'recognized_dimensions':list(canonical)},pd.DataFrame(source))


def text_list(value):
    if isinstance(value,list):return value
    value=str(value or '').strip()
    if value.startswith('['):
        data=json.loads(value)
        if not isinstance(data,list):raise ValueError('输入应为文本列表')
        return data
    return split(value)


def parse_person_data(ctx,name):
    import contextlib, io
    # The library advertises on import. Worker stdout is a JSON event protocol.
    with contextlib.redirect_stdout(io.StringIO()):
        import jionlp as jio
    key='address_list' if name=='address_split' else 'id_list'
    if ctx.args.get('file_path'):
        df=ctx.table(ctx.args['file_path'],dtype=str)
        column=ctx.args.get('address_column' if name=='address_split' else 'id_column') or df.columns[0]
        ctx.require(df,[column]);values=df[column].dropna().tolist()
    else:values=text_list(ctx.args.get(key))
    if not values:raise ValueError('请填写'+('地址' if name=='address_split' else '身份证号码'))
    rows=[]
    for value in values:
        if not isinstance(value,str):raise ValueError('地址或身份证号码应为文本，防止前导零丢失')
        if name=='address_split':
            parsed=jio.parse_location(value)
            rows.append({'原始地址':value,**parsed})
        else:
            parsed=jio.parse_id_card(value)
            rows.append({'身份证号':value,**(parsed or {}),'解析状态':'成功' if parsed else '无效号码'})
    df=pd.DataFrame(rows);ctx.report(df,'地址拆分.xlsx' if name=='address_split' else '身份证解析.xlsx')
    return ctx.result(frame=df)


TASKS={'related_party':related,'qcc_processor':qcc,'address_split':lambda c:parse_person_data(c,'address_split'),'id_card':lambda c:parse_person_data(c,'id_card')}
