"""Additional native-vs-independent checks for ambiguous feature edge behavior."""
from pathlib import Path
import importlib.util
import json
import math
import pandas as pd
from jet_reference import apply_feature

root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('_core',r'C:\Users\Install\Desktop\SW审计工具箱\modules\jet_test\_core.pyd')
core=importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
duplicate=pd.DataFrame({'摘要':['甲','甲','甲',None,None],'金额':[1,1,2,None,None]})
amounts=pd.DataFrame({'借方金额':[0.01,-0.01,123,-123,999,1000,1000.01,'abc'],'贷方金额':[0,10,999,123,999,0,111,None]})
equal=pd.DataFrame({'甲':[None,'','  ','甲','001',1,True],'乙':[None,None,'','甲',1,'1',1]})
invalid_date=pd.DataFrame({'日期':['2026-01-01',None,'invalid','']})
cases=[
    ('all_columns_duplicate',duplicate,'逻辑_行内容重复',None,None),
    ('subset_duplicate',duplicate,'逻辑_行内容重复','摘要',None),
    ('tail_decimal_and_overlap',amounts,'文本_提取后几位','借方金额,贷方金额','3'),
    ('modulus_negative',amounts,'数值_求余数','借方金额','10'),
    ('equality_empty_and_type',equal,'逻辑_对比两列相同','甲,乙',None),
    ('invalid_date_month',invalid_date,'日期_提取月份','日期',None),
    ('invalid_date_weekend',invalid_date,'日期_判断周末','日期',None),
]
def clean(value):
    return None if pd.isna(value) else value.item() if hasattr(value,'item') else value
records=[]
for name,df,tool,cols,param in cases:
    expected=core.FeatureEngine.apply_tool(df.copy(),tool,cols,param).tolist()
    actual=apply_feature(df.copy(),tool,cols,param).tolist()
    okay=len(actual)==len(expected)
    for left,right in zip(expected,actual):
        if pd.isna(left):
            okay=okay and pd.isna(right)
        elif isinstance(left,(int,float)):
            okay=okay and math.isclose(left,right,rel_tol=1e-12,abs_tol=1e-9)
        else:
            okay=okay and left==right
    records.append({'name':name,'tool':tool,'native':[clean(v) for v in expected],'reference':[clean(v) for v in actual],'equal':bool(okay)})
summary={'cases':len(records),'rowChecks':sum(len(item['native']) for item in records),'failureCount':sum(not item['equal'] for item in records),'records':records}
(root/'feature-edge-verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
raise SystemExit(1 if summary['failureCount'] else 0)
