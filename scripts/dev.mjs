import {spawn} from 'node:child_process';
import path from 'node:path';
const build=spawn(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit'});
build.on('exit',code=>{if(code)process.exit(code);const env={...process.env,AUDIT_NODE:process.execPath,AUDIT_PYTHON:process.env.AUDIT_PYTHON||path.resolve('build/python/python.exe'),AUDIT_DATA_DIR:path.resolve('artifacts/dev-state')};spawn('node_modules/electron/dist/electron.exe',['.'],{stdio:'inherit',env}).on('exit',code=>process.exit(code||0));});
