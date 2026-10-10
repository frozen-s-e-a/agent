from pathlib import Path
import importlib.util
import inspect
import json
import pandas as pd

root = Path(__file__).resolve().parent
source = Path(r"C:\Users\Install\Desktop\SW审计工具箱\modules\jet_test\_builtin.pyd")
spec = importlib.util.spec_from_file_location('_builtin',source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for name in dir(module):
    if name.startswith('__'):
        continue
    value = getattr(module,name)
    try:
        signature = str(inspect.signature(value)) if callable(value) else None
    except (TypeError,ValueError):
        signature = None
    if isinstance(value,(str,int,float,list,dict,tuple)):
        print(json.dumps({'name':name,'type':type(value).__name__,'signature':signature,'value':value},ensure_ascii=False,default=str))
    else:
        print(json.dumps({'name':name,'type':type(value).__name__,'signature':signature},ensure_ascii=False))

config = Path(r"C:\Users\Install\Desktop\SW审计工具箱\_template\JET配置表.xlsx")
for sheet in ['特征定义','规则筛选']:
    df = pd.read_excel(config,sheet_name=sheet)
    print(sheet, df.columns.tolist(), df.head(2).to_dict(orient='records'))
