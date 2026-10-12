import fs from 'node:fs';
import path from 'node:path';
export function inside(root, candidate) {
  const realRoot=fs.realpathSync(root), real=fs.realpathSync(path.resolve(realRoot,candidate));
  const rel=path.relative(realRoot,real);
  if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)) throw new Error('文件超出项目授权目录');
  return real;
}
export function listFiles(root, sub='') {
  const dir=inside(root,sub);
  return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>!e.name.startsWith('.')&&!['node_modules'].includes(e.name)).slice(0,500).flatMap(e=>{
    try { const p=inside(root,path.join(dir,e.name)); const s=fs.statSync(p);return [{name:e.name,path:path.relative(root,p),directory:s.isDirectory(),size:s.size}]; } catch{return [];}
  });
}
