"""Attach packaged-runtime checks, hash the delivered files and create a ZIP."""
from pathlib import Path
import hashlib,json,zipfile

ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'package.json').read_text(encoding='utf8'))['version']
delivery=ROOT/'artifacts/test/windows-x64'/VERSION/'AI助手'
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while block:=f.read(1024*1024):h.update(block)
    return h.hexdigest()
def latest(pattern):return max(ROOT.glob(pattern),key=lambda p:p.stat().st_mtime_ns)

runtime_path=ROOT/'artifacts/independent-validation/run-bc308643c5/验收记录.json'
runtime=read(runtime_path);assert runtime['cases']==runtime['passedCases']==83 and runtime['tasksCovered']==63
app_path=latest('artifacts/package-validation-*/程序包启动验收.json')
app=read(app_path);assert app['passed'] and app['standalone'] and len(app['records'])==6
launcher_path=latest('artifacts/launcher-validation-*/启动方式验收.json')
launchers=read(launcher_path);assert launchers['passed'] and launchers['cases']==2 and launchers['shortcutVerified']
verification_path=ROOT/'src/resources/verification.json';verification=read(verification_path)
verification['packagedRuntime']={'cases':runtime['cases'],'passedCases':runtime['passedCases'],'tasksCovered':runtime['tasksCovered'],'desktopCases':6,'launchers':2,'shortcutVerified':True,'version':VERSION}
for name,path in [('包内业务验收',runtime_path),('独立程序启动验收',app_path),('启动方式验收',launcher_path)]:
    verification['evidence'][name]={'path':str(path.relative_to(ROOT)),'sha256':digest(path)}
    (delivery/'验收记录'/ (name+'.json')).write_bytes(path.read_bytes())
verification_path.write_text(json.dumps(verification,ensure_ascii=False,indent=2),encoding='utf8')
(delivery/'resources/app/src/resources/verification.json').write_bytes(verification_path.read_bytes())
manifest_path=delivery/'build-manifest.json';manifest=read(manifest_path);manifest['verification']=verification;manifest['packageValidationPassed']=True
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
document=ROOT/'docs/独立客户端验收与使用-20261010.md'
text=document.read_text(encoding='utf8')+'\n## 程序包实测\n\n直接使用程序包内 Python 与依赖重跑全部 83 个业务案例，覆盖 63 项，全部通过。实际包内 EXE 在未设置开发运行库路径的情况下独立启动，完成 6 个关键业务案例。项目根启动脚本、包内启动脚本及原项目快捷方式均验证指向并打开此版本。相关记录随包保留。\n'
document.write_text(text,encoding='utf8');(delivery/document.name).write_text(text,encoding='utf8')
files=[]
for file in sorted(delivery.rglob('*')):
    if file.is_file() and file.name!='package-files.json':files.append({'path':str(file.relative_to(delivery)),'size':file.stat().st_size,'sha256':digest(file)})
(delivery/'package-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf8')
archive=ROOT/'artifacts'/('AI审计助手-'+VERSION+'-Windows-x64.zip')
if archive.exists():raise FileExistsError('不要覆盖已有交付压缩包: '+str(archive))
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for file in sorted(delivery.rglob('*')):
        if file.is_file():z.write(file,str(Path('AI助手')/file.relative_to(delivery)))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'AI助手/AI助手.exe' in z.namelist()
summary={'version':VERSION,'archive':str(archive),'archiveSha256':digest(archive),'bytes':archive.stat().st_size,'files':len(files)+1,'entry':str(delivery/'AI助手.exe'),'zipIntegrityVerified':True}
archive.with_suffix('.sha256').write_text(summary['archiveSha256']+'  '+archive.name+'\n',encoding='utf8')
(ROOT/'artifacts'/('交付记录-'+VERSION+'.json')).write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False),flush=True)
