import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
export default defineConfig({
  root: path.join(projectRoot, 'src/client'),
  base: './',
  build: {outDir: path.join(projectRoot, 'build/client'), emptyOutDir: true},
  server: {host: '127.0.0.1', port: 5173}
});
