"""Read PyInstaller's documented archive layouts; extract code only for local research."""
from pathlib import Path
import dis
import hashlib
import importlib.util
import json
import marshal
import struct
import types
import zlib

ROOT=Path(__file__).resolve().parent
SOURCE=Path(r'C:\Users\Install\Desktop\SW审计工具箱\sw audit tool box.exe')
DEST=ROOT/'frozen'
DEST.mkdir(exist_ok=True)
raw=SOURCE.read_bytes()
cookie=raw.rfind(b'MEI\x0c\x0b\x0a\x0b\x0e')
assert cookie>=0
magic,size,toc_offset,toc_size,version,library=struct.unpack_from('!8sIIII64s',raw,cookie)
assert version==312,version
start=cookie+88-size
toc=raw[start+toc_offset:start+toc_offset+toc_size]
cursor=0
entries={}
while cursor<len(toc):
    length,offset,compressed_size,uncompressed_size,flag,kind=struct.unpack_from('!IIIIBc',toc,cursor)
    name=toc[cursor+18:cursor+length].rstrip(b'\0').decode('utf-8')
    entries[name]=(offset,compressed_size,uncompressed_size,flag,kind.decode())
    cursor+=length
def extract(name):
    offset,length,_,flag,_=entries[name]
    data=raw[start+offset:start+offset+length]
    return zlib.decompress(data) if flag else data
def save_code(name,kind,encoded):
    code=marshal.loads(encoded)
    if not isinstance(code,types.CodeType):
        return None
    components=name.split('.')
    assert all(component.replace('_','').isalnum() for component in components)
    target=DEST.joinpath(*components)
    if kind==1:
        target=target/'__init__'
    target=target.with_suffix('.pyc')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(importlib.util.MAGIC_NUMBER+b'\0'*12+encoded)
    return {'name':name,'kind':kind,'filename':code.co_filename,'file':target.relative_to(ROOT).as_posix(),
            'sha256':hashlib.sha256(encoded).hexdigest(),'globals':list(code.co_names)}
records=[]
for name,entry in entries.items():
    if entry[-1]=='z':
        pyz=extract(name)
        assert pyz[:4]==b'PYZ\0'
        assert pyz[4:8]==importlib.util.MAGIC_NUMBER
        pyz_toc=marshal.loads(pyz[struct.unpack_from('!I',pyz,8)[0]:])
        for module_name,(kind,offset,length) in dict(pyz_toc).items():
            if kind in [0,1]:
                record=save_code(module_name,kind,zlib.decompress(pyz[offset:offset+length]))
                if record:
                    records.append(record)
    elif entry[-1] in ['m','M','s']:
        try:
            record=save_code(name,1 if entry[-1]=='M' else 0,extract(name))
            if record:
                records.append(record)
        except (ValueError,AssertionError):
            pass
business=[]
for record in records:
    name=record['name']
    if not (name in ['ai_utils','mcp_server','_mcp_module_registry','main','config','common','app_context','excel_utils','utils','context'] or name.startswith(('src.','modules.'))):
        continue
    code=marshal.loads((ROOT/record['file']).read_bytes()[16:])
    functions=[]
    def walk(value):
        if isinstance(value,types.CodeType):
            functions.append({'name':value.co_qualname,'args':list(value.co_varnames[:value.co_argcount]),
                              'names':list(value.co_names),'line':value.co_firstlineno,
                              'strings':[item for item in value.co_consts if isinstance(item,str)]})
            for item in value.co_consts:
                walk(item)
    walk(code)
    record['functions']=functions
    business.append(record)
    with (ROOT/(name.replace('.','_')+'.bytecode.txt')).open('w',encoding='utf-8') as output:
        dis.dis(code,file=output)
result={'sourceSha256':hashlib.sha256(raw).hexdigest(),'pythonVersion':version,'extractedCodeModules':len(records),
        'businessSupportCandidates':business,'modules':records,'executedArchiveCode':False,
        'formatReference':'https://github.com/pyinstaller/pyinstaller/blob/develop/PyInstaller/archive/readers.py'}
(ROOT/'frozen-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'extractedCodeModules':len(records),'businessSupport':[record['name'] for record in business]},ensure_ascii=False))
