"""Record original feature formulas on synthetic data, including boundary cases."""
from pathlib import Path
import importlib.util
import inspect
import json
import sys
import types

import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parent
LEGACY = Path(r"C:\Users\Install\Desktop\SW审计工具箱")
def load(name,path):
    spec = importlib.util.spec_from_file_location(name,path)
    value = importlib.util.module_from_spec(spec)
    sys.modules[name] = value
    spec.loader.exec_module(value)
    return value

core = load('_core',LEGACY / 'modules/jet_test/_core.pyd')
builtin = load('_builtin',LEGACY / 'modules/jet_test/_builtin.pyd')
(ROOT / 'native-builtins.json').write_text(json.dumps({'features':builtin.BUILTIN_FEATURES,'rules':builtin.BUILTIN_RULES,'tools':builtin.AVAILABLE_TOOLS},ensure_ascii=False,indent=2),encoding='utf-8')
amounts = [999.95,-999.95,0,1000.12,'1,000.12',None,'abc',1234567.89]
df = pd.DataFrame({
    '制单日期':pd.to_datetime(['2025-12-31','2026-02-01','2026-01-01',None,'2026-01-31','2026-12-31','2026-01-01','2026-01-01']),
    '凭证日期':pd.to_datetime(['2026-01-01','2026-01-31','2025-12-31','2026-01-04','2026-02-01','2026-01-01',None,'2026-01-01']),
    '制单时间':pd.to_datetime(['2026-01-01 00:00:00','2026-01-01 06:59:00','2026-01-01 07:00:00','2026-01-01 22:00:00','2026-01-01 23:59:00',None,'2026-01-01 12:00:00','2026-01-01 12:00:00']),
    '借方金额':amounts,
    '贷方金额':[0,0,1234.56,555,999.99,None,10,0],
    '摘要':[None,'','  ','回款','abc',123,'相同','相同'],
    '制单人':[None,'甲','甲','乙','','  ','甲','甲'],
    '审核人':[None,'甲','乙','乙',None,'','甲','甲'],
    '科目编码':['6001','6001','6001','1002',None,'','6001','6001'],
    '类型':['记','记','记','记','记','记','记','记'],
    '编号':['A','A','B','B','C','C','D','D'],
})
def clean(value):
    if isinstance(value,dict):
        return {str(k):clean(v) for k,v in value.items()}
    if isinstance(value,(list,tuple)):
        return [clean(v) for v in value]
    if isinstance(value,(pd.Timestamp,np.datetime64)):
        return None if pd.isna(value) else str(value)
    if isinstance(value,np.generic):
        return clean(value.item())
    if value is pd.NaT or value is pd.NA or isinstance(value,float) and pd.isna(value):
        return None
    return value

records=[]
for feature in builtin.BUILTIN_FEATURES:
    try:
        result = core.FeatureEngine.apply_tool(df.copy(),feature['tool'],feature['source_cols'],feature['param'])
        records.append({'feature':feature,'result':clean(result.tolist()) if isinstance(result,pd.Series) else clean(result),'resultType':type(result).__name__})
    except Exception as error:
        records.append({'feature':feature,'error':f'{type(error).__name__}: {error}'})
records.append({'helper':'_force_numeric','input':clean(amounts),'result':clean(core._force_numeric(pd.Series(amounts,dtype=object)).tolist())})
for value in [None,'','abc','1,000.12','-1,000.12','(1,000.12)','￥1,000','12%','NaN']:
    try:
        records.append({'helper':'_force_numeric_val','input':value,'result':clean(core._force_numeric_val(value))})
    except Exception as error:
        records.append({'helper':'_force_numeric_val','input':value,'error':str(error)})
for value in [None,'','甲，乙','甲, 乙','甲,,乙','[甲,乙]']:
    try:
        records.append({'helper':'_parse_cols','input':value,'result':clean(core.FeatureEngine._parse_cols(value))})
    except Exception as error:
        records.append({'helper':'_parse_cols','input':value,'error':str(error)})
(ROOT / 'feature-observations.json').write_text(json.dumps({'input':clean(df.to_dict(orient='records')),'observations':records},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(records,ensure_ascii=False,default=str))

# Import only the MCP JET adapter, with inert parent package placeholders.
for name,folder in [('modules',LEGACY / 'modules'),('modules.jet_test',LEGACY / 'modules/jet_test')]:
    package=types.ModuleType(name)
    package.__path__=[str(folder)]
    sys.modules[name]=package
sys.modules['modules.jet_test._core']=core
sys.modules['modules.jet_test._builtin']=builtin
try:
    execute = load('modules.jet_test.jet_test_execute',LEGACY / 'modules/jet_test/jet_test_execute.pyd')
    signatures={}
    for name in dir(execute):
        if not name.startswith('__'):
            value=getattr(execute,name)
            try:
                signatures[name]=str(inspect.signature(value)) if callable(value) else type(value).__name__
            except (TypeError,ValueError):
                signatures[name]=type(value).__name__
    (ROOT / 'execute-signatures.json').write_text(json.dumps(signatures,ensure_ascii=False,indent=2),encoding='utf-8')
    print('execute',json.dumps(signatures,ensure_ascii=False))
except Exception as error:
    print('execute import',type(error).__name__,str(error))
