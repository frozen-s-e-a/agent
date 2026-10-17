"""Compile the Windows launcher and append the verified independent app."""
from pathlib import Path
import hashlib,json,shutil,struct,subprocess,zipfile

ROOT=Path(__file__).resolve().parents[1]
version=json.loads((ROOT/'package.json').read_text(encoding='utf8'))['version']
delivery=ROOT/'artifacts/test/windows-x64'/version/'AI助手'
manifest=json.loads((delivery/'build-manifest.json').read_text(encoding='utf8'))
assert manifest['packageValidationPassed']
build=ROOT/'build/single-file';build.mkdir(parents=True,exist_ok=True)
exe=ROOT/'artifacts'/('AI审计助手-'+version+'.exe')
if exe.exists():raise FileExistsError('不要覆盖已有单文件程序')
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while chunk:=f.read(1024*1024):h.update(chunk)
    return h.hexdigest()
for name in ['使用说明.md','独立客户端验收与使用-20261010.md']:
    source=ROOT/'docs'/name;text=source.read_text(encoding='utf8')
    intro='\n## 单文件启动\n\n本次提供一个可独立携带的 `AI审计助手-'+version+'.exe`。直接双击即可，首次运行自动将完整程序释放到本机用户目录，之后复用已准备文件；不要求管理员权限或手动解压。保留现有项目与模型设置。内部的 AI助手.exe 仍由完整运行目录支持，外层单文件 EXE 已包含这些文件。\n'
    if '## 单文件启动' not in text:text=text.replace('\n',intro+'\n',1)
    source.write_text(text,encoding='utf8');(delivery/name).write_text(text,encoding='utf8')
records=[]
for file in sorted(delivery.rglob('*')):
    if file.is_file() and file.name!='package-files.json':records.append({'path':str(file.relative_to(delivery)),'size':file.stat().st_size,'sha256':digest(file)})
index=delivery/'package-files.json';index.write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
payload=build/'payload.zip'
with zipfile.ZipFile(payload,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for file in sorted(delivery.rglob('*')):
        if file.is_file():z.write(file,str(Path('AI助手')/file.relative_to(delivery)))
payload_hash=digest(payload)
source=(ROOT/'src/desktop-launcher/PortableLauncher.cs').read_text(encoding='utf8').replace('__VERSION__',version).replace('__PAYLOAD_HASH__',payload_hash).replace('__MANIFEST_HASH__',digest(index))
compiled_source=build/'PortableLauncher.cs';compiled_source.write_text(source,encoding='utf8')
compiler=Path('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
stub=build/'launcher.exe'
args=[str(compiler),'/nologo','/target:winexe','/platform:x64','/optimize+','/codepage:65001','/out:'+str(stub),'/win32manifest:'+str(ROOT/'src/desktop-launcher/app.manifest')]
for assembly in ['System.Windows.Forms','System.Drawing','System.IO.Compression','System.IO.Compression.FileSystem','System.Web.Extensions']:args.append('/reference:'+assembly+'.dll')
args.append(str(compiled_source));subprocess.run(args,cwd=ROOT,check=True)
with exe.open('xb') as f:
    for file in [stub,payload]:
        with file.open('rb') as incoming:shutil.copyfileobj(incoming,f,1024*1024)
    f.write(struct.pack('<q',payload.stat().st_size));f.write(b'AUDIT-SFX-1-END')
report={'version':version,'file':str(exe),'sha256':digest(exe),'bytes':exe.stat().st_size,'embeddedFiles':len(records)+1,'payloadSha256':payload_hash,'mode':'single-file-portable','administratorRequired':False}
(ROOT/'artifacts'/('单文件交付-'+version+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False),flush=True)
