"""Static coverage inventory for all 63 registered MCP entries. No native imports."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import re
import struct

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
LEGACY=Path(r'C:\Users\Install\Desktop\SW审计工具箱')
LEDGER=json.loads((ROOT/'artifacts/migration-analysis-20261010/feature-ledger.json').read_text(encoding='utf-8'))

def inspect(file):
    raw=file.read_bytes()
    pe=struct.unpack_from('<I',raw,0x3c)[0]
    machine,count,_,_,_,opt_size,_=struct.unpack_from('<HHIIIHH',raw,pe+4)
    opt=pe+24
    if struct.unpack_from('<H',raw,opt)[0]!=0x20b:
        raise ValueError('Not PE32+')
    base=struct.unpack_from('<Q',raw,opt+24)[0]
    sections=[]
    for index in range(count):
        start=opt+opt_size+index*40
        name,size,rva,file_size,offset=struct.unpack_from('<8sIIII',raw,start)
        flags=struct.unpack_from('<I',raw,start+36)[0]
        sections.append({'name':name.rstrip(b'\0').decode('ascii'),'size':size,'rva':rva,'fileSize':file_size,'offset':offset,'executable':bool(flags&0x20000000)})
    def offset_of(address):
        rva=address-base
        for section in sections:
            if section['rva']<=rva<section['rva']+section['fileSize']:
                return section['offset']+rva-section['rva']
    def string_at(address,limit=4000):
        start=offset_of(address)
        if start is None:
            return None
        end=raw.find(b'\0',start,min(len(raw),start+limit))
        if end<0:
            return None
        try:
            return raw[start:end].decode('utf-8')
        except UnicodeError:
            return None
    def executable(address):
        return any(section['executable'] and base+section['rva']<=address<base+section['rva']+section['size'] for section in sections)
    methods=[]
    for section in sections:
        if section['executable']:
            continue
        for start in range(section['offset'],section['offset']+section['fileSize']-31,8):
            name,func,flags,doc=struct.unpack_from('<QQQQ',raw,start)
            if not 0<flags<=0xffff or not executable(func):
                continue
            name=string_at(name,200)
            if name and re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]{0,160}',name):
                methods.append({'name':name,'va':hex(func),'flags':flags,'doc':string_at(doc) if doc else None})
    clues=[]
    for match in re.finditer(rb'[\x20-\x7e]{5,}',raw):
        token=match.group().decode('ascii')
        if re.search(r'(?:modules\.|bank_flow\.|monthly_analysis\.|https?://|\.pyx?$|\.c$)',token):
            clues.append(token[:300])
    return {'file':file.relative_to(LEGACY).as_posix(),'size':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
            'machine':hex(machine),'cythonMarker':b'__pyx_' in raw,'methodCandidates':methods,'stringClues':sorted(set(clues))}

modules=[]
for file in sorted((LEGACY/'modules').rglob('*.pyd')):
    try:
        modules.append(inspect(file))
    except Exception as error:
        modules.append({'file':file.relative_to(LEGACY).as_posix(),'error':f'{type(error).__name__}: {error}'})
by_file={module['file']:module for module in modules}
support=['_core.pyd','_builtin.pyd','_data.pyd','_engine.pyd','_utils.pyd','_helpers.pyd','_processor.pyd','_reader.pyd','_writer.pyd']
entries=[]
for entry in LEDGER['entries']:
    file=entry['legacyFile']
    mapped=by_file.get(file)
    siblings=[]
    folder=Path(file).parent.as_posix()
    if folder!='modules':
        siblings=[module['file'] for module in modules if Path(module['file']).parent.as_posix()==folder and Path(module['file']).name in support]
    candidates=[file]+[file for file in siblings if file!=entry['legacyFile']]
    methods=[]
    for candidate in candidates:
        for method in by_file[candidate].get('methodCandidates',[]):
            if method['name'] in ['send','throw','close','__reduce__','__reduce_ex__','CythonUnboundCMethod'] or method['name'].startswith('lambda'):
                continue
            methods.append({'file':candidate,**method})
    # This is evidence maturity, not a declaration that the algorithm is extracted.
    maturity='entry_mapped_static_candidates_only' if methods else 'entry_mapped_needs_deeper_native_analysis'
    if entry['legacyName'] in ['jet_test_inspect','jet_test_execute']:
        maturity='shared_jet_core_partially_reconstructed_verified'
    entries.append({'id':entry['id'],'name':entry['legacyName'],'package':entry['package'],'entryFile':file,
                    'entryExists':bool(mapped),'coreSupportFiles':siblings,'candidateMethods':methods,
                    'maturity':maturity,'productionMigrationComplete':False})
assert len(entries)==len(set(entry['name'] for entry in entries))==63
assert all(entry['entryExists'] for entry in entries)
summary={'registeredEntries':len(entries),'mappedEntries':sum(entry['entryExists'] for entry in entries),
         'nativeModuleFiles':len(modules),'cythonMarkerFiles':sum(module.get('cythonMarker',False) for module in modules),
         'filesWithMethodCandidates':sum(bool(module.get('methodCandidates')) for module in modules),
         'scanErrors':sum('error' in module for module in modules),'packageEntryCounts':dict(Counter(entry['package'] for entry in entries)),
         'entriesWithCandidates':sum(bool(entry['candidateMethods']) for entry in entries),
         'staticOnly':True,'productionMigrationComplete':0}
result={'date':'2026-10-10','summary':summary,'entries':entries,'modules':modules,
        'notes':['Method names and strings locate targets; they do not establish calculations or verified behavior.',
                 'Shared support modules are path-based candidates and are not a verified dynamic call graph.',
                 'Only selected JET calculations have an independent research reconstruction so far.']}
(OUT/'core-coverage.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
