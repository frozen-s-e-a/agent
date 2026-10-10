"""One process per native file; importing never runs a business task."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
coverage = json.loads((ROOT / 'core-coverage.json').read_text(encoding='utf-8'))
files = sorted({entry['entryFile'] for entry in coverage['entries']} |
               {file for entry in coverage['entries'] for file in entry['coreSupportFiles']})
records = []
def one(relative):
    path = ROOT / 'introspection' / (relative.replace('/', '__') + '.json')
    try:
        result = subprocess.run([sys.executable, '-X', 'utf8', '-B', str(ROOT / 'introspect_one.py'), relative, str(path)],
                                capture_output=True, text=True, encoding='utf-8', timeout=55)
        if path.exists():
            record = json.loads(path.read_text(encoding='utf-8'))
            return {'file':relative, 'loaded':record['loaded'], 'error':record.get('error'),
                    'functions':len(record.get('functions', [])), 'classes':len(record.get('classes', [])),
                    'record':path.relative_to(ROOT).as_posix(), 'exitCode':result.returncode}
        return {'file':relative, 'loaded':False, 'error':result.stderr[-1500:], 'exitCode':result.returncode}
    except Exception as error:
        return {'file':relative, 'loaded':False, 'error':str(error)}
started = time.time()
with ThreadPoolExecutor(max_workers=4) as pool:
    for future in as_completed([pool.submit(one, file) for file in files]):
        record = future.result()
        records.append(record)
        print(json.dumps({'done':len(records), 'total':len(files), **record}, ensure_ascii=False), flush=True)
summary = {'nativeFiles':len(files), 'loaded':sum(record['loaded'] for record in records),
           'seconds':round(time.time()-started, 2), 'calledBusinessRun':False, 'networkDisabled':True}
(ROOT / 'introspection-summary.json').write_text(json.dumps({'summary':summary,'records':sorted(records,key=lambda item:item['file'])},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False), flush=True)
