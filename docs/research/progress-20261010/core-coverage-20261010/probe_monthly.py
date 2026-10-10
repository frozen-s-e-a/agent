"""Load only the monthly calculation core to check callable signatures; no run or API calls."""
from pathlib import Path
import hashlib
import importlib.util
import inspect
import json
import sys
import types

ROOT=Path(__file__).resolve().parent
SOURCE=Path(r'C:\Users\Install\Desktop\SW审计工具箱\modules\monthly_analysis\_core.pyd')
record={'module':'modules/monthly_analysis/_core.pyd','sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'calledBusinessRun':False,'calledRemoteApi':False,'functions':[]}
# The core imports the optional AI SDK even for arithmetic. Isolate that dependency
# for research with an explicit fail-closed constructor; this does not emulate AI.
if importlib.util.find_spec('openai') is None:
    class DisabledAiClient:
        def __init__(self,*args,**kwargs):
            raise RuntimeError('AI client is disabled in this arithmetic research probe')
    ai_stub=types.ModuleType('openai')
    ai_stub.OpenAI=DisabledAiClient
    for name in ['APITimeoutError','APIError','APIConnectionError','RateLimitError']:
        setattr(ai_stub,name,type(name,(Exception,),{}))
    sys.modules['openai']=ai_stub
    record['unavailableDependency']='openai'
    record['researchDependencyIsolation']='OpenAI constructor replaced by a function that always fails; no API implementation'
try:
    spec=importlib.util.spec_from_file_location('_core',SOURCE)
    core=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(core)
    record['loaded']=True
    for name in ['calc_sub_name','calc_sub_code','calc_level','remove_parent_code','find_parent_codes','_prepare_df','_agg_by_sub','_filter_transfer_entries','_select_focus_months','monthly_analysis']:
        value=getattr(core,name,None)
        record['functions'].append({'name':name,'callable':callable(value),'signature':str(inspect.signature(value)) if callable(value) else None,'doc':getattr(value,'__doc__',None)})
except Exception as error:
    record.update({'loaded':False,'error':f'{type(error).__name__}: {error}'})
(ROOT/'monthly-callable-signatures.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(record,ensure_ascii=False))
