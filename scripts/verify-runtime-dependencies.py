"""Check the actual bundled distributions and retain their license metadata."""
from pathlib import Path
import contextlib,hashlib,importlib,importlib.metadata as metadata,io,json,re,sys

ROOT=Path(__file__).resolve().parents[1];packages=ROOT/'build/python-packages'
normalize=lambda name:re.sub(r'[-_.]+','-',name).lower()
expected={normalize(line.split('==')[0]):line.split('==')[1] for line in (ROOT/'requirements.txt').read_text().splitlines() if '==' in line}
actual={normalize(d.metadata['Name']):d for d in metadata.distributions(path=[str(packages)])}
records=[]
for name,version in expected.items():
    if name not in actual:raise RuntimeError('Missing runtime dependency: '+name)
    dist=actual[name]
    if dist.version!=version:raise RuntimeError(name+': installed '+dist.version+' != '+version)
    licenses=[]
    for relative in dist.files or []:
        if not re.search(r'licen[sc]e|copying|copyright',str(relative),re.I):continue
        path=dist.locate_file(relative)
        if path.is_file():licenses.append({'path':str(path.relative_to(packages)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    records.append({'name':dist.metadata['Name'],'version':dist.version,'license':dist.metadata.get('License-Expression') or dist.metadata.get('License'),'projectUrls':dist.metadata.get_all('Project-URL') or [],'licenseFiles':licenses})
with contextlib.redirect_stdout(io.StringIO()):
    for name in ['duckdb','openpyxl','psutil','pypdf','pandas','numpy','PIL','pymupdf','xlrd','jionlp','yaml','requests']:
        importlib.import_module(name)
report={'python':sys.version.split()[0],'distributions':records,'pinsVerified':len(expected),'importsVerified':12}
(packages/'independent-dependencies.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'pinsVerified':len(expected),'importsVerified':12,'manifest':str(packages/'independent-dependencies.json')}))
