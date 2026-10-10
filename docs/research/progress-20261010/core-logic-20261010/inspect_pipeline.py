"""Probe JET adapter-to-core contracts using only synthetic local inputs."""
from pathlib import Path
import importlib.util
import sys
import types
import json
import pandas as pd

ROOT=Path(__file__).resolve().parent
LEGACY=Path(r"C:\Users\Install\Desktop\SW审计工具箱")
for name,folder in [('modules',LEGACY/'modules'),('modules.jet_test',LEGACY/'modules/jet_test')]:
    package=types.ModuleType(name)
    package.__path__=[str(folder)]
    sys.modules[name]=package
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,LEGACY/'modules/jet_test'/file)
    module=importlib.util.module_from_spec(spec)
    sys.modules[name]=module
    spec.loader.exec_module(module)
    return module
core=load('modules.jet_test._core','_core.pyd')
builtin=load('modules.jet_test._builtin','_builtin.pyd')
execute=load('modules.jet_test.jet_test_execute','jet_test_execute.pyd')
rules=[{'name':'basic_positive','conditions':{'测试文本':'调整'}},{'name':'basic_numeric','conditions':{'测试数值':'>7'}}]
df=pd.read_excel(ROOT/'synthetic.xlsx')
features=execute._features_to_df([])
matrix=execute._rules_to_df(rules)
print('features',features.columns.tolist(),features.to_dict(orient='records'))
print('matrix',matrix.columns.tolist(),matrix.to_dict(orient='records'))
def serialize(value):
    if isinstance(value,pd.DataFrame):
        return {'type':'DataFrame','columns':value.columns.tolist(),'rows':value.fillna('').to_dict(orient='records')}
    if isinstance(value,dict):
        return {str(k):serialize(v) for k,v in value.items()}
    if isinstance(value,(tuple,list)):
        return [serialize(v) for v in value]
    return value if isinstance(value,(str,int,float,bool,type(None))) else str(value)

for label in ['unknown_columns','standard_columns','with_sequence','with_feature','with_feature_no_sequence']:
    if label=='standard_columns':
        df['摘要']=df['测试文本']
        df['借方金额']=df['测试数值']
        rules=[{'name':'basic_positive','conditions':{'摘要':'调整'}},{'name':'basic_numeric','conditions':{'借方金额':'>7'}}]
        matrix=execute._rules_to_df(rules)
    if label=='with_sequence':
        matrix.insert(0,'序号',range(1,len(matrix)+1))
    if label=='with_feature':
        features=execute._features_to_df([builtin.BUILTIN_FEATURES[1]])
    if label=='with_feature_no_sequence':
        matrix=matrix.drop(columns=['序号'])
    try:
        valid=core.validate_prerequisites(df,features,matrix,'Synthetic')
        result=core.process_data_chunk(df.copy(),'合成测试公司',features,matrix)
        print(label,'validation',str(valid))
        (ROOT/f'pipeline-{label}.json').write_text(json.dumps({'features':serialize(features),'matrix':serialize(matrix),'validation':serialize(valid),'result':serialize(result)},ensure_ascii=False,indent=2),encoding='utf-8')
        if isinstance(result,tuple):
            print(label,'tuple',[(type(item).__name__, list(item.keys()) if isinstance(item,dict) else str(item)[:400]) for item in result])
            result_info=[]
            for item in result:
                if isinstance(item,pd.DataFrame):
                    result_info.append({'type':'DataFrame','columns':item.columns.tolist(),'rows':item.fillna('').to_dict(orient='records')})
                elif isinstance(item,dict):
                    result_info.append({'type':'dict','value':{str(k):v.fillna('').to_dict(orient='records') if isinstance(v,pd.DataFrame) else str(v) for k,v in item.items()}})
                else:
                    result_info.append({'type':type(item).__name__,'value':str(item)})
            (ROOT/f'pipeline-{label}.json').write_text(json.dumps(result_info,ensure_ascii=False,indent=2),encoding='utf-8')
        else:
            print(label,'result',type(result).__name__,str(result)[:600])
    except Exception as error:
        print(label,type(error).__name__,str(error))

observations=json.loads((ROOT/'condition-observations.json').read_text(encoding='utf-8'))
for row in observations:
    if row['function']=='_check_condition' and row['rule'] in ['^6,^7,!^1','调整,回款,!甲','!=0,!=1','=1000.0','.01','1e3','1.']:
        print(json.dumps({k:v for k,v in row.items() if k not in ['mask','dtype']},ensure_ascii=False))
