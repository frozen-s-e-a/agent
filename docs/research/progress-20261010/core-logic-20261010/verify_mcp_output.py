"""Compare four independent rule masks against the original EXE's actual workbook."""
from pathlib import Path
import hashlib
import json
import sys
import pandas as pd
from jet_reference import check_condition

root=Path(__file__).resolve().parent
source=root/'synthetic-mcp.xlsx'
data=pd.read_excel(source)
rules=json.loads((root/'mcp-probe-rules.json').read_text(encoding='utf-8'))
response=json.loads((root/'oracle/validated/response.json').read_text(encoding='utf-8'))
message=json.loads(next(item['text'] for item in response['content'] if item['type']=='text'))
output=Path(message['output_files'][0])
book=pd.ExcelFile(output)
comparisons=[]
for rule in rules:
    mask=pd.Series(True,index=data.index)
    for column,expression in rule['conditions'].items():
        predicate=check_condition(data[column],expression)
        if predicate is not None:
            mask=mask & predicate
    expected=data.loc[mask,'ProbeId'].tolist()
    actual=pd.read_excel(book,sheet_name=rule['name'])['ProbeId'].tolist()
    comparisons.append({'rule':rule['name'],'expectedIds':expected,'actualIds':actual,'equal':expected==actual})
summary_sheet=pd.read_excel(book,sheet_name='汇总')
summary={'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'originalOutput':str(output),
         'reportedTotalHits':message['total_hits'],'expectedRuleHitSum':sum(len(item['expectedIds']) for item in comparisons),
         'summaryRows':len(summary_sheet),'distinctSourceRows':summary_sheet['ProbeId'].nunique(),'comparisons':comparisons,
         'failureCount':sum(not item['equal'] for item in comparisons),'referenceLegacyCodeLoaded':False}
(root/'mcp-output-verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
if summary['failureCount'] or summary['reportedTotalHits']!=summary['expectedRuleHitSum']:
    raise SystemExit(1)

native=json.loads((root/'native-builtins.json').read_text(encoding='utf-8'))
template=json.loads((root.parents[1]/'src/resources/jet-rules.json').read_text(encoding='utf-8'))
normalize=lambda name:name.replace('（','(').replace('）',')').strip()
original_by_name={normalize(rule['name']):rule for rule in native['rules']}
template_by_name={normalize(rule['name']):rule for rule in template['rules']}
differences=[]
for name in sorted(set(original_by_name)&set(template_by_name)):
    a=original_by_name[name]['conditions']
    b=template_by_name[name]['conditions']
    if a!=b:
        differences.append({'name':name,'nativeMcp':a,'excelTemplate':b})
duplicate_names=[]
for name in sorted(template_by_name):
    entries=[rule for rule in template['rules'] if normalize(rule['name'])==name]
    if len(entries)>1:
        duplicate_names.append({'name':name,'count':len(entries),'entries':entries})
delta={'nativeRuleRows':len(native['rules']),'templateRuleRows':len(template['rules']),
       'nativeDistinctNames':len(original_by_name),'templateDistinctNames':len(template_by_name),
       'templateRepeatedNames':duplicate_names,'conditionDifferences':differences,
       'nativeOnlyNames':sorted(set(original_by_name)-set(template_by_name)),
       'templateOnlyNames':sorted(set(template_by_name)-set(original_by_name))}
(root/'rule-source-differences.json').write_text(json.dumps(delta,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(delta,ensure_ascii=False))

baseline=json.loads((root/'reference-verification.json').read_text(encoding='utf-8'))
edges=json.loads((root/'feature-edge-verification.json').read_text(encoding='utf-8'))
manifest={'date':'2026-10-10','python':sys.version,'pandas':pd.__version__,'scope':'JET core reconstruction research',
          'productionClientChanged':False,'sourceBinaries':[],'verificationSummary':{'conditionCases':260,'featureCases':13,'mcpRuleCases':len(rules)}}
manifest['verificationSummary'].update({'featureEdgeCases':edges['cases'],'rowChecks':baseline['conditionRowChecks']+baseline['featureRowChecks']+edges['rowChecks'],
                                      'failureCount':baseline['failureCount']+edges['failureCount']+summary['failureCount']})
legacy=Path(r'C:\Users\Install\Desktop\SW审计工具箱\modules\jet_test')
for file in ['_core.pyd','_builtin.pyd','jet_test_execute.pyd']:
    native_path=legacy/file
    manifest['sourceBinaries'].append({'path':str(native_path),'sha256':hashlib.sha256(native_path.read_bytes()).hexdigest()})
(root/'recovery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
