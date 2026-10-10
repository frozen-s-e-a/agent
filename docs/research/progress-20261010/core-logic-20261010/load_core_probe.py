"""Research process only: load the original JET extension with bundled CPython."""
import importlib.util
import json
import inspect
from pathlib import Path

source = Path(r"C:\Users\Install\Desktop\SW审计工具箱\modules\jet_test\_core.pyd")
spec = importlib.util.spec_from_file_location("_core", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for name in ["_check_condition", "_check_single_item", "process_data_chunk", "FeatureEngine", "validate_prerequisites"]:
    value = getattr(module, name, None)
    try:
        signature = str(inspect.signature(value))
    except (TypeError, ValueError):
        signature = None
    print(json.dumps({"name":name,"type":type(value).__name__,"signature":signature,"doc":getattr(value,'__doc__',None)},ensure_ascii=False))
print(json.dumps({"public": [name for name in dir(module) if not name.startswith('__')]},ensure_ascii=False))
