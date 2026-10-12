import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const logPath = path.join(root, 'artifacts/logs/startup.log');

function log(message) {
  console.log(message);
  fs.appendFileSync(logPath, message + '\n');
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, windowsHide: true, stdio: ['inherit', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => { process.stdout.write(chunk); fs.appendFileSync(logPath, chunk); });
    child.stderr.on('data', chunk => { process.stderr.write(chunk); fs.appendFileSync(logPath, chunk); });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited with ${signal || code}`));
    });
  });
}

try {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] Starting client\n`);
  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  const electron = path.join(root, 'node_modules/electron/dist/electron.exe');
  const python = process.env.AUDIT_PYTHON || path.join(root, 'build/python/python.exe');
  for (const file of [vite, electron, python]) {
    if (!fs.existsSync(file)) throw new Error(`Required runtime file is missing: ${file}`);
  }
  const env = {
    ...process.env,
    AUDIT_NODE: process.execPath,
    AUDIT_PYTHON: python,
    AUDIT_DATA_DIR: process.env.AUDIT_DATA_DIR || path.join(root, 'artifacts/dev-state'),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  log('Building the current client...');
  await run(process.execPath, [vite, 'build', '--configLoader', 'native'], env);
  log('Opening the desktop window...');
  await run(electron, [root], env);
  log('Desktop application closed.');
} catch (error) {
  const message = `Startup failed: ${error.message}`;
  console.error(message);
  try { fs.appendFileSync(logPath, message + '\n'); } catch { /* The console still shows the failure if logging is unavailable. */ }
  process.exitCode = 1;
}
