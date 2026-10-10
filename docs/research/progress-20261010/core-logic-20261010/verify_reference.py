"""Compare independent formulas with recorded native observations, without loading native code."""
from pathlib import Path
import json
import math
import pandas as pd
from jet_reference import check_single_item,check_condition,apply_feature,force_numeric,parse_cols

root=Path(__file__).resolve().parent
dataset=json.loads((root/'synthetic-values.json').read_text(encoding='utf-8'))
observed=json.loads((root/'condition-observations.json').read_text(encoding='utf-8'))
failures=[]
for index,record in enumerate(observed):
    series=pd.Series([row[record['column']] for row in dataset],dtype=object)
    rule=float('nan') if record['rule']=='<float_nan>' else record['rule']
    result=(check_single_item if record['function']=='_check_single_item' else check_condition)(series,rule)
    if record.get('meaning')=='no_condition':
        okay=result is None
    else:
        okay=result is not None and [bool(value) for value in result]==record.get('mask')
    if not okay:
        failures.append({'index':index,'function':record['function'],'column':record['column'],'rule':record['rule'],
                         'expected':record.get('mask'),'actual':None if result is None else [bool(value) for value in result]})

feature_fixture=json.loads((root/'feature-observations.json').read_text(encoding='utf-8'))
df=pd.DataFrame(feature_fixture['input'])
for column in ['制单日期','凭证日期','制单时间']:
    df[column]=pd.to_datetime(df[column])
feature_count=0
for record in feature_fixture['observations']:
    feature=record.get('feature')
    if not feature:
        continue
    feature_count+=1
    actual=apply_feature(df.copy(),feature['tool'],feature['source_cols'],feature['param']).tolist()
    expected=record['result']
    different=[]
    for index,(left,right) in enumerate(zip(expected,actual)):
        if left is None:
            okay=pd.isna(right)
        elif isinstance(left,(int,float)):
            okay=math.isclose(left,right,rel_tol=1e-12,abs_tol=1e-9)
        else:
            okay=left==right
        if not okay:
            different.append({'row':index,'expected':left,'actual':str(right)})
    if different or len(actual)!=len(expected):
        failures.append({'feature':feature['name'],'differences':different})
summary={'conditionCases':len(observed),'conditionRowChecks':sum(len(record.get('mask',[])) for record in observed),
         'featureCases':feature_count,'featureRowChecks':feature_count*len(df),'failureCount':len(failures),'failures':failures,
         'legacyCodeLoaded':False,'scope':'research reconstruction; not production migration'}
(root/'reference-verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
raise SystemExit(1 if failures else 0)
