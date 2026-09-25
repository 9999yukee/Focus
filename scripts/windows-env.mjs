import { existsSync, readdirSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

export function windowsEnvironment() {
  const env = { ...process.env };
  const extraPaths = [join(homedir(), '.cargo', 'bin'), join(process.env.APPDATA ?? '', 'npm')];
  if (process.platform === 'win32' && existsSync('.tools/sdk-base/c')) {
    const vswhere = join(process.env['ProgramFiles(x86)'] ?? 'C:/Program Files (x86)', 'Microsoft Visual Studio/Installer/vswhere.exe');
    const install = execFileSync(vswhere, ['-latest', '-all', '-products', '*', '-property', 'installationPath'], { encoding: 'utf8', windowsHide: true }).trim();
    const tools = join(install, 'VC/Tools/MSVC');
    const version = readdirSync(tools).filter(value => /^\d+\./.test(value)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
    if (!version) throw new Error('MSVC toolchain not found. Install the Desktop development with C++ workload.');
    const compiler = join(tools, version);
    const sdk = join(process.cwd(), '.tools/sdk-base/c');
    const libs = join(process.cwd(), '.tools/sdk-x64/c');
    extraPaths.push(join(compiler, 'bin/Hostx64/x64'), join(sdk, 'bin/10.0.19041.0/x64'));
    env.LIB = [join(compiler, 'lib/x64'), join(libs, 'ucrt/x64'), join(libs, 'um/x64')].join(';');
    env.INCLUDE = [join(compiler, 'include'), ...['ucrt', 'shared', 'um', 'winrt'].map(part => join(sdk, 'Include/10.0.19041.0', part))].join(';');
    env.WindowsSdkDir = `${sdk}\\`;
    env.WindowsSDKVersion = '10.0.19041.0\\';
    env.VCToolsInstallDir = `${compiler}\\`;
    env.VSCMD_ARG_TGT_ARCH = 'x64';
    env.VSCMD_ARG_HOST_ARCH = 'x64';
  }
  env.PATH = `${extraPaths.join(delimiter)}${delimiter}${process.env.PATH}`;
  return env;
}
