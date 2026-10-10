"""Golden observations of original pure functions on synthetic inputs only."""
from pathlib import Path
import contextlib
import io
import itertools
import json
import math
import re

import numpy as np
import pandas as pd
from research_loader import prepare, load

ROOT = Path(__file__).resolve().parent
prepare()
records = []
modules = {}
def clean(value):
    if isinstance(value, pd.DataFrame):
        return {'type':'DataFrame','columns':clean(value.columns.tolist()),'index':clean(value.index.tolist()),'data':clean(value.values.tolist())}
    if isinstance(value, pd.Series):
        return {'type':'Series','name':clean(value.name),'index':clean(value.index.tolist()),'data':clean(value.tolist())}
    if isinstance(value, dict):
        return {str(key):clean(item) for key,item in value.items()}
    if isinstance(value, set):
        return {'type':'set','values':sorted((clean(item) for item in value),key=str)}
    if isinstance(value, (list,tuple)):
        return [clean(item) for item in value]
    if isinstance(value, (pd.Timestamp, np.datetime64)):
        return None if pd.isna(value) else str(value)
    if value is pd.NaT or value is pd.NA:
        return None
    if isinstance(value, np.generic):
        return clean(value.item())
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return {'type':'float','value':str(value)}
    return value
def observe(module_name, function, args, kwargs=None, bound=None):
    kwargs = kwargs or {}
    if module_name not in modules:
        modules[module_name] = load('modules/'+module_name+'.pyd')
    module = modules[module_name]
    obj = module
    if bound:
        cls = getattr(module, bound)
        obj = cls.__new__(cls)
    fn = getattr(obj, function)
    record = {'module':module_name,'function':function,'boundClass':bound,'args':clean(args),'kwargs':clean(kwargs)}
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            result = fn(*args, **kwargs)
        record['result'] = clean(result)
        record['mutatedArgs'] = clean(args)
    except Exception as error:
        record['error'] = {'type':type(error).__name__,'message':str(error)}
    records.append(record)

for value, kv, item in itertools.product(
    [None, np.nan, '', '  ', 123, '客户:甲;部门:乙', 'A:1:A;A:2;:0;B:;C', '【客户:甲】【部门:乙】',
     '[客户=甲][部门=乙]', '（客户：甲）（部门：乙）', ' A : 1 ; B : 2 ', 'A:1，B:2', '无分隔符'],
    [':','：','=',''], [';','，','【】','[]','（）','']):
    observe('asist_split','_parse_auxiliary_item',[value,kv,item])
for value in [None,np.nan,'', ' ， ', '甲,乙', '甲， 乙,,甲', ['甲','乙'], 123, 'A;B']:
    observe('select_column','_parse_sheet_keywords',[value])
for keywords in [[],['甲'],['A'],['a'],[''],['甲','明细']]:
    observe('select_column','_filter_sheets_by_keywords',[['甲表','乙表','A01','a01','明细表'],keywords])
for value in ['A','Z','AA','ZZ','XFD','a','aa','A1','',None,' A ']:
    observe('merge_column','_letter_to_number',[value])
for names in [['甲','甲','乙','甲'], ['甲.1','甲','甲'], [1,None,'', ''], ['借方','借方','借方.1','借方']]:
    observe('bankflowmerge','_get_renamed_columns_list',[names])
    observe('subject_clean/_core','_get_renamed_columns_list',[names])
for col in ['A','Z','AA','XFD','a','',None,'AZ']:
    observe('bankflowmerge','increment_column',[col])
for code, give, step, full, delimiter in itertools.product(
    ['6001','600101','60010101','6001.01.02','6001-01-02', 600101, None, ''],
    ['6001','600101','6001.01', '', None], [2], [0,8], [None,'.','-']):
    observe('monthly_analysis/_core','calc_sub_code',[code,give,step,full,delimiter])
for code, step, init, delim in itertools.product(['6001','600101','60010101','6001.01.02','',None,6001], [1,2], [4], [None,'.']):
    observe('monthly_analysis/_core','calc_level',[code,step,init,delim])
for name, flag, start, level in itertools.product(['收入_商品_境内','收入/商品/境内','甲','',None,123], ['_','/',''], [0,1], [1,2,3,4]):
    observe('monthly_analysis/_core','calc_sub_name',[name,flag,start,level])
for codes in [['1','10','101','2'], ['6001','600101','600102','6601'], ['6001','6001'], ['1','','2'], [None,'1'], [1,10], []]:
    observe('monthly_analysis/_core','find_parent_codes',[codes])
    df=pd.DataFrame({'科目代码':codes,'金额':list(range(len(codes)))})
    observe('monthly_analysis/_core','remove_parent_code',[df.copy(),'科目代码'])
    observe('subject_clean/_core','_filter_leaf_accounts',[df.copy(),'科目代码'])
for items in [['1 科目','01:现金','6001收入','甲'], ['1.甲','2 乙','3-丙'], [None,1,''], []]:
    observe('subject_clean/_core','_clean_numeric_prefix',[items])
for value in [None, '', 0, 12.34, '1,000.50', '(100)', '￥100', '1 000', 'nan', np.nan, 'abc']:
    observe('bank_flow','safe_float',[value])
    observe('bank_flow','clean_name',[value],bound='DataCleaner')
    observe('paper_verify','normalize_value',[value])
for value in [None, '', '客户，金额', '客户, 金额,,日期', '["客户","日期"]', ['客户'], '客户;金额']:
    observe('paper_verify','_parse_match_keys',[value])
for value in [None, '', '甲 公司（测试）', ' ABC Ltd (China) ', 'ＡＢＣ（甲）', 123]:
    observe('related_party','normalize_name',[value])
for value in ['1 企业概况........ 2', '2.10 变更记录  23', '普通文本 2025', '企业标签（5） 12', '']:
    observe('qcc_processor','_clean_toc_line',[value])
    observe('qcc_processor','_get_sort_tuple',[value])
for value in ['企查查_甲公司_报告.docx','甲公司.docx','/tmp/乙公司（信用报告）.docx','甲-乙.docx','A_B_C.docx']:
    observe('qcc_processor','_extract_company_name',[value])
for value in ['a/b:c*d?e"f<g>h|i',' 甲公司\n报告 ','a\\b',None,123,'CON','']:
    for name in ['ipo_bj','ipo_sh','ipo_sz']:
        observe(name,'sanitize_filename',[value])
for value in ['cb({"a":1});',' {"a":1} ', 'cb([1,2])', 'callback123({"a":"(b)"})', 'bad', '', None]:
    for name in ['ipo_bj','ipo_sh']:
        observe(name,'process_jsonp',[value])
for value in ['A1:B5','A1','a1:c3','$A$1:$B$5','B5:A1','A:B','1:3','XFD10:XFD20','bad',None]:
    observe('link_replace_range','parse_range',[value])
for text in ['甲 公司（有限）','a/b:c*?[]',' ABC \n DEF ',None,'资金划转']:
    observe('gross_margin_analysis','_clean_illegal_chars',[text])
for r1,c1,v1,r0,c0,v0 in [(120,80,10,100,70,10),(200,140,20,100,70,10),(100,60,10,100,70,10),
                          (0,0,0,100,70,10),(100,70,10,0,0,0),(100,70,0,100,70,10),
                          (-100,-70,-10,100,70,10),(100,80,10,100,70,0)]:
    row=pd.Series({'本期营业收入':r1,'本期营业成本':c1,'本期数量':v1,'上期营业收入':r0,'上期营业成本':c0,'上期数量':v0})
    observe('gross_margin_analysis','pvm_decompose',[row])

for delta, revenue, threshold, revenue_threshold in itertools.product([-0.06,-0.05,0,0.05,0.06,np.nan], [0,100], [0.05], [0,100]):
    df=pd.DataFrame({'毛利率变动':[delta],'本期营业收入':[revenue]})
    observe('gross_margin_analysis','mark_threshold',[df,threshold,revenue_threshold])

(ROOT/'helper-observations.json').write_text(json.dumps({'syntheticOnly':True,'networkDisabled':True,'records':records},ensure_ascii=False,indent=2),encoding='utf-8')
counts={}
for record in records:
    key=record['module']+'.'+record['function']
    counts.setdefault(key, {'cases':0,'succeeded':0,'errors':0})
    counts[key]['cases']+=1
    counts[key]['succeeded']+=int('result' in record)
    counts[key]['errors']+=int('error' in record)
(ROOT/'helper-observation-summary.json').write_text(json.dumps({'totalCases':len(records),'functions':counts},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'totalCases':len(records),'functions':counts},ensure_ascii=False))
