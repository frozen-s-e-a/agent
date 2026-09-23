import fs from 'node:fs';
import path from 'node:path';
const input=process.argv[2];if(!input)throw Error('用法：node scripts/runtime.mjs <Python 安装目录>');
const dest=path.resolve('build/python');fs.mkdirSync(dest,{recursive:true});
for(const name of ['python.exe','pythonw.exe','python312.dll','python3.dll','vcruntime140.dll','vcruntime140_1.dll','LICENSE.txt'])if(fs.existsSync(path.join(input,name)))fs.copyFileSync(path.join(input,name),path.join(dest,name));
for(const name of ['DLLs','Lib'])fs.cpSync(path.join(input,name),path.join(dest,name),{recursive:true,filter:p=>!p.split(path.sep).some(x=>['site-packages','__pycache__','test','tests','idlelib','tkinter','turtledemo','ensurepip'].includes(x))});
fs.mkdirSync('build/runtime',{recursive:true});fs.copyFileSync(process.execPath,'build/runtime/node.exe');console.log('Copied isolated Python and Node runtimes');
