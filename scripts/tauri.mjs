import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { buildBridge } from './build-bridge.mjs';
import { windowsEnvironment } from './windows-env.mjs';

await buildBridge();
// A fresh terminal is not required after rustup/pnpm installation.
const env = windowsEnvironment();
const cli = join(process.cwd(), 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 1));
