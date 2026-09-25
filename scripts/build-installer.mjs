import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { windowsEnvironment } from './windows-env.mjs';

const root = process.cwd();
const child = spawn('cargo', process.argv.slice(2), {
    cwd: join(root, 'installer'),
    env: windowsEnvironment(),
    stdio: 'inherit',
    windowsHide: true,
});
child.on('exit', code => process.exit(code ?? 1));