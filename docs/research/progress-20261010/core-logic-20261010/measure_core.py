"""Measure pure JET computations on synthetic values; no original UI or settings."""
from pathlib import Path
import ctypes
import importlib.util
import inspect
import json
import math
import re

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
SOURCE = Path(r"C:\Users\Install\Desktop\SW审计工具箱\modules\jet_test\_core.pyd")
spec = importlib.util.spec_from_file_location("_core", SOURCE)
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

dataset = json.loads((ROOT / "synthetic-values.json").read_text(encoding="utf-8"))
cases = [
    None, "", " ", float("nan"), "[空]", "![空]", "调整", "#调整", "!调整", "!#调整",
    "^6", "!^6", "^6001,^6051", "!^1,!^2", "!^1,!^2,!^3,!^4,!^5,!^6",
    "调整,回款", "调整，回款", "!调整,!回款", "!调整,回款", "^6,!^1",
    ">7", ">=7", "<7", "<=7", "=0", "==0", "!=0", "0", "1000", "=1000",
    ">22,<7", ">=6,<=8", ">abc", "nan", "NaN", "None", "nan,None", "!nan",
    "是", "否", "True", "False", "[", ".", "调.*", "^", "!", "#", "=", "!#",
    "> 7", " >= 7 ", "7，8", "7,,8", " , ", "!^1,^2", "!^1,!^2,^6",
    "^6,^7,!^1", "调整,回款,!甲", "!=0,!=1", "=1000.0", "-0.01", ".01", "1e3", "1.",
]
records = []
for column in ["测试文本", "测试数值"]:
    values = pd.Series([row[column] for row in dataset], dtype=object)
    for function in ["_check_single_item", "_check_condition"]:
        for case in cases:
            try:
                result = getattr(core, function)(values, case)
                if result is None:
                    records.append({"column":column,"function":function,"rule":"<float_nan>" if isinstance(case,float) and math.isnan(case) else case,"result":None,"meaning":"no_condition"})
                    continue
                record = {"column":column,"function":function,"rule": "<float_nan>" if isinstance(case,float) and math.isnan(case) else case,
                          "hits":[dataset[index]['id'] for index,value in enumerate(result) if bool(value)],
                          "mask":[bool(value) for value in result],"dtype":str(result.dtype)}
            except Exception as error:
                record = {"column":column,"function":function,"rule":"<float_nan>" if isinstance(case,float) and math.isnan(case) else case,
                          "error":f"{type(error).__name__}: {error}"}
            records.append(record)
(ROOT / "condition-observations.json").write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding="utf-8")

# Recover only known Python objects used as constants in the disassembled functions.
# Validate the pointed object's Python type before casting it.
native_base = ctypes.WinDLL(str(SOURCE))._handle
labels = []
for name in ["check-single-body.asm", "check-condition-body.asm"]:
    assembly = (ROOT / name).read_text(encoding="utf-8")
    for address in sorted(set(int(value,16) for value in re.findall(r'\[(0x18003[0-9a-f]+)\]',assembly))):
        runtime = native_base + address - 0x180000000
        pointer = ctypes.c_void_p.from_address(runtime).value
        if not pointer:
            continue
        # Object constants in this region have been initialized by Cython.
        kind = ctypes.c_void_p.from_address(pointer + 8).value
        if kind not in [id(str),id(int),id(float),id(bool),id(tuple),id(list),id(dict)]:
            continue
        value = ctypes.cast(pointer,ctypes.py_object).value
        if type(value) not in [str,int,float,bool] or (type(value) is float and not math.isfinite(value)):
            continue
        labels.append({"originalVa":hex(address),"value":value,"type":type(value).__name__})
labels = list({item['originalVa']:item for item in labels}.values())
(ROOT / "constant-labels.json").write_text(json.dumps(labels,ensure_ascii=False,indent=2),encoding="utf-8")
mapping = {item['originalVa']:item['value'] for item in labels}
for name in ["check-single-body.asm", "check-condition-body.asm"]:
    lines = []
    for line in (ROOT / name).read_text(encoding="utf-8").splitlines():
        additions = [f"{address} = {mapping[address]!r}" for address in re.findall(r'\[(0x18003[0-9a-f]+)\]',line) if address in mapping]
        lines.append(line + (" ; PY_CONSTANT " + "; ".join(additions) if additions else ""))
    (ROOT / name.replace('.asm','.annotated.asm')).write_text('\n'.join(lines)+'\n',encoding="utf-8")

signatures = {}
for name in dir(core.FeatureEngine):
    if not name.startswith('__'):
        value = getattr(core.FeatureEngine,name)
        try:
            signatures[name] = str(inspect.signature(value))
        except (TypeError,ValueError):
            signatures[name] = type(value).__name__
(ROOT / "feature-signatures.json").write_text(json.dumps(signatures,ensure_ascii=False,indent=2),encoding="utf-8")
selected = [item for item in records if item['function']=='_check_condition' and item['rule'] in ["!^1,!^2", "!调整,!回款", "!调整,回款", ">22,<7", "[空]", "![空]", "=1000", "==0", "调.*"]]
print(json.dumps({"observations":len(records),"errors":sum('error' in item for item in records),"constants":len(labels),"featureSignatures":signatures,"selected":selected},ensure_ascii=False))
