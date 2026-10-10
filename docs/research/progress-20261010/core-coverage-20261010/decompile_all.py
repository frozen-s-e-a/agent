"""Preserve C pseudocode for all 63 entrypoints and their business helpers.

This is native-code evidence, not a claim of a correct Python reconstruction.
PyMethodDef wrapper candidates are resolved to a nearby called business body
where possible. Ambiguous calls remain explicitly marked as candidates.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import os
import re
import struct
import subprocess
import time

ROOT = Path(__file__).resolve().parent
LEGACY = Path(r'C:\Users\Install\Desktop\SW审计工具箱')
TOOLROOT = ROOT / 'tools/cutter/Cutter-v2.5.0-Windows-x86_64'
RIZIN = TOOLROOT / 'rizin.exe'
env = dict(os.environ, SLEIGHHOME=str(TOOLROOT / 'lib/rizin/plugins/rz_ghidra_sleigh'))
coverage = json.loads((ROOT / 'core-coverage.json').read_text(encoding='utf-8'))
files = {entry['entryFile'] for entry in coverage['entries']} | {file for entry in coverage['entries'] for file in entry['coreSupportFiles']}
exclude = {'get_description', 'get_category', 'get_input_file_path', 'get_excel_config_schema', 'get_planning_guide',
           'log', 'print_summary', 'send', 'throw', 'close', '__reduce__', '__reduce_ex__', 'CythonUnboundCMethod'}

def runtime_ranges(path):
    raw = path.read_bytes()
    pe = struct.unpack_from('<I', raw, 0x3c)[0]
    count = struct.unpack_from('<H', raw, pe+6)[0]
    optsize = struct.unpack_from('<H', raw, pe+20)[0]
    base = struct.unpack_from('<Q', raw, pe+48)[0]
    ranges = {}
    for index in range(count):
        offset = pe+24+optsize+index*40
        name, _, _, size, start = struct.unpack_from('<8sIIII', raw, offset)
        if name.rstrip(b'\0') == b'.pdata':
            for position in range(start, start+size-11, 12):
                begin, end, unwind = struct.unpack_from('<III', raw, position)
                if end > begin:
                    ranges[base+begin] = end-begin
    return ranges

def rizin(path, commands, timeout=45):
    return subprocess.run([str(RIZIN), '-N', '-q', '-e', 'scr.color=0', '-e', 'scr.interactive=false', '-c', commands, str(path)],
                          capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout, env=env)

def one(module, method):
    source = LEGACY / module['file']
    folder = ROOT / 'decompiled' / module['file'].replace('/', '__')
    folder.mkdir(parents=True, exist_ok=True)
    prefix = folder / (method['name'] + '__' + method['va'])
    manifest = prefix.with_suffix('.json')
    if manifest.exists():
        previous = json.loads(manifest.read_text(encoding='utf-8'))
        if previous.get('decompiled'):
            return previous
    record = {'module':module['file'], 'sourceSha256':module['sha256'], 'method':method['name'],
              'wrapperVa':method['va'], 'evidenceOnly':True, 'executablePythonReconstruction':False}
    try:
        address = int(method['va'], 16)
        parsed = rizin(source, f'af @ {address};pdfj @ {address}', timeout=20)
        lines = [line for line in parsed.stdout.splitlines() if line.startswith('{')]
        wrapper = json.loads(lines[-1]) if lines else {}
        calls = sorted({op['jump'] for op in wrapper.get('ops', []) if op.get('type')=='call' and 'jump' in op})
        ranges = runtime_ranges(source)
        nearby = [target for target in calls if address < target < address+4096 and ranges.get(target, 0)>250]
        body = min(nearby) if nearby else address
        record.update({'bodyVa':hex(body), 'bodySelection':'nearby_direct_call_candidate' if body!=address else 'method_body_or_unresolved_wrapper',
                       'wrapperBytes':wrapper.get('size'), 'directCalls':[hex(target) for target in calls]})
        prefix.with_suffix('.wrapper.json').write_text(json.dumps(wrapper, ensure_ascii=False), encoding='utf-8')
        commands = f'af @ {body};afn recovered_{method["name"]} @ {body};pdg @ {body}'
        result = rizin(source, commands, timeout=55)
        text = result.stdout
        success = len(text)>100 and 'Ghidra Decompiler Error' not in text and '{' in text
        prefix.with_suffix('.c').write_text('// Native decompiler evidence. Not reconstructed source.\n' +
                                       '// ' + module['file'] + ' ' + method['name'] + ' ' + hex(body) + '\n' + text,
                                       encoding='utf-8')
        prefix.with_suffix('.diagnostics.txt').write_text(result.stderr, encoding='utf-8')
        record.update({'decompiled':success, 'outputBytes':len(text.encode('utf-8')), 'exitCode':result.returncode,
                       'cFile':prefix.with_suffix('.c').relative_to(ROOT).as_posix()})
    except Exception as error:
        record.update({'decompiled':False, 'error':f'{type(error).__name__}: {error}'})
    manifest.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    return record

jobs = []
for module in coverage['modules']:
    if module['file'] not in files:
        continue
    unique = set()
    for method in module.get('methodCandidates', []):
        if method['name'] in exclude or method['name'].startswith('lambda'):
            continue
        key = (method['name'], method['va'])
        if key not in unique:
            unique.add(key)
            jobs.append((module, method))
# Every registered business entry first, then shared calculations and helpers.
jobs.sort(key=lambda job:(job[1]['name']!='run', job[0]['file'], job[1]['name']))
records = []
started = time.time()
with ThreadPoolExecutor(max_workers=3) as pool:
    for future in as_completed([pool.submit(one, module, method) for module,method in jobs]):
        record = future.result()
        records.append(record)
        if record['method']=='run' or len(records)%20==0:
            print(json.dumps({'done':len(records), 'total':len(jobs), 'method':record['method'], 'module':record['module'],
                              'decompiled':record['decompiled'], 'error':record.get('error')},ensure_ascii=False), flush=True)
        (ROOT / 'decompile-progress.json').write_text(json.dumps({'done':len(records),'total':len(jobs),
            'decompiled':sum(record['decompiled'] for record in records), 'last':record},ensure_ascii=False,indent=2),encoding='utf-8')
entry_records = []
for entry in coverage['entries']:
    runs = [record for record in records if record['module']==entry['entryFile'] and record['method']=='run']
    entry_records.append({'name':entry['name'], 'entryFile':entry['entryFile'], 'runCandidates':runs,
                           'hasDecompilerOutput':any(record['decompiled'] for record in runs), 'independentMigrated':False})
summary = {'businessNativeFunctions':len(jobs), 'decompiledFunctions':sum(record['decompiled'] for record in records),
           'entrypoints':63, 'entrypointsWithRunOutput':sum(item['hasDecompilerOutput'] for item in entry_records),
           'seconds':round(time.time()-started,2), 'evidenceOnly':True, 'productionMigrationComplete':0}
(ROOT / 'decompile-manifest.json').write_text(json.dumps({'summary':summary,'entries':entry_records,'functions':records},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False),flush=True)
