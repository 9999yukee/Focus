import { spawn } from 'node:child_process';
import { windowsEnvironment } from './windows-env.mjs';
const child = spawn('cargo', process.argv.slice(2), { cwd: 'src-tauri', env: windowsEnvironment(), stdio: 'inherit', windowsHide: true });
child.on('exit', code => process.exit(code ?? 1));
