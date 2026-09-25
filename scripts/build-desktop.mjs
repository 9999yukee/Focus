import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = JSON.parse(await readFile(join(root, 'desktop/upstream.json'), 'utf8'));
const tools = join(root, '.tools/desktop');
const source = join(tools, `Vencord-${upstream.revision}`);
const archive = join(tools, 'vencord-source.zip');
function run(program, args, options = {}) {
    const result = spawnSync(program, args, { cwd: source, stdio: 'inherit', windowsHide: true, ...options });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${program} failed (${result.status}).`);
}
await mkdir(tools, { recursive: true });
if (!existsSync(archive)) {
    const response = await fetch(`https://codeload.github.com/Vendicated/Vencord/zip/${upstream.revision}`);
    if (!response.ok) throw new Error(`Source download failed: ${response.status}`);
    await writeFile(archive, new Uint8Array(await response.arrayBuffer()));
}
if (createHash('sha256').update(await readFile(archive)).digest('hex') !== upstream.sourceSha256)
    throw new Error('Vencord source integrity check failed.');
if (!existsSync(source)) run('powershell.exe', ['-NoProfile', '-Command',
    'Expand-Archive -LiteralPath $env:FOCUS_SOURCE_ARCHIVE -DestinationPath $env:FOCUS_SOURCE_PARENT'], {
    cwd: root, env: { ...process.env, FOCUS_SOURCE_ARCHIVE: archive, FOCUS_SOURCE_PARENT: tools }
});
const plugin = join(source, 'src/userplugins/focus');
await mkdir(plugin, { recursive: true });
await cp(join(root, 'desktop/plugin'), plugin, { recursive: true });
for (const file of ['media/MediaResourceManager.ts', 'settings/types.ts', 'performance/FrameSampler.ts']) {
    await mkdir(dirname(join(plugin, 'shared', file)), { recursive: true });
    await cp(join(root, 'src', file), join(plugin, 'shared', file));
}
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
if (!existsSync(join(source, 'node_modules/.modules.yaml'))) run(pnpm, ['install', '--frozen-lockfile']);
run(process.execPath, [join(source, 'node_modules/typescript/bin/tsc'), '--noEmit']);
run(process.execPath, ['scripts/build/build.mjs', '--standalone', '--disable-updater'], {
    env: { ...process.env, VENCORD_HASH: upstream.revision.slice(0, 7), VENCORD_REMOTE: 'Vendicated/Vencord' }
});
const output = join(root, 'artifacts/desktop/Focus');
await mkdir(join(output, 'dist'), { recursive: true });
for (const file of ['patcher.js', 'preload.js', 'renderer.js', 'renderer.css', 'patcher.js.map', 'preload.js.map', 'renderer.js.map', 'renderer.css.map', 'patcher.js.LEGAL.txt', 'renderer.js.LEGAL.txt'])
    if (existsSync(join(source, 'dist', file))) await cp(join(source, 'dist', file), join(output, 'dist', file));
await cp(join(root, 'desktop'), join(output, 'source/desktop'), { recursive: true });
await cp(join(root, 'src/media'), join(output, 'source/src/media'), { recursive: true });
await cp(join(root, 'src/settings'), join(output, 'source/src/settings'), { recursive: true });
await mkdir(join(output, 'source/src/performance'), { recursive: true });
await cp(join(root, 'src/performance/FrameSampler.ts'), join(output, 'source/src/performance/FrameSampler.ts'));
await mkdir(join(output, 'source/src-tauri/icons'), { recursive: true });
await cp(join(root, 'src-tauri/icons/icon.ico'), join(output, 'source/src-tauri/icons/icon.ico'));
await mkdir(join(output, 'source/scripts'), { recursive: true });
await cp(join(root, 'scripts/build-desktop.mjs'), join(output, 'source/scripts/build-desktop.mjs'));
for (const file of ['audit-desktop-settings.mjs', 'check-desktop-patches.mjs', 'test-desktop.mjs', 'verify-desktop-startup.mjs', 'install-desktop.ps1', 'WindowsIdentity.ps1'])
    await cp(join(root, 'scripts', file), join(output, 'source/scripts', file));
await mkdir(join(output, 'source/tests'), { recursive: true });
for (const file of ['desktop-model.test.ts', 'desktop-navigation.test.ts'])
    await cp(join(root, 'tests', file), join(output, 'source/tests', file));
await cp(join(root, 'scripts/install-desktop.ps1'), join(output, 'Install-Focus.ps1'));
await cp(join(root, 'scripts/WindowsIdentity.ps1'), join(output, 'WindowsIdentity.ps1'));
await cp(join(root, 'desktop/README.md'), join(output, 'README.md'));
await writeFile(join(output, 'LIRE-MOI.txt'), `Focus 0.2 - Discord Desktop\r\n\r\nFermez Discord puis ouvrez "Installer Focus.cmd".\r\nLancez ensuite le raccourci Focus du Bureau.\r\nPour revenir au client standard : fermez Discord et ouvrez "Desinstaller Focus.cmd".\r\n\r\nDiscord Desktop doit etre installe sur la machine cible.\r\nGuide : source/desktop/README.md\r\nValidation : docs/DESKTOP_VALIDATION.md\r\nIntegration non officielle avec Vencord ; sources et licence incluses.\r\n`);
await mkdir(join(output, 'docs'), { recursive: true });
await cp(join(root, 'docs/DESKTOP_VALIDATION.md'), join(output, 'docs/DESKTOP_VALIDATION.md'));
await mkdir(join(output, 'source/docs'), { recursive: true });
await cp(join(root, 'docs/DESKTOP_VALIDATION.md'), join(output, 'source/docs/DESKTOP_VALIDATION.md'));
await cp(join(root, 'docs/SETTINGS_AUDIT.md'), join(output, 'docs/SETTINGS_AUDIT.md'));
await cp(join(root, 'docs/SETTINGS_AUDIT.md'), join(output, 'source/docs/SETTINGS_AUDIT.md'));
await cp(join(root, 'package.json'), join(output, 'source/package.json'));
await cp(join(root, 'pnpm-lock.yaml'), join(output, 'source/pnpm-lock.yaml'));
await cp(join(root, 'pnpm-workspace.yaml'), join(output, 'source/pnpm-workspace.yaml'));
await writeFile(join(output, 'Installer Focus.cmd'), '@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Focus.ps1" -PackagePath "%~dp0"\r\npause\r\n');
await writeFile(join(output, 'Desinstaller Focus.cmd'), '@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Focus.ps1" -Uninstall\r\npause\r\n');
await cp(join(root, 'src-tauri/icons/icon.ico'), join(output, 'Focus.ico'));
await cp(archive, join(output, 'source/vencord-source.zip'));
await cp(join(source, 'LICENSE'), join(output, 'LICENSE-Vencord'));
const files = {};
for (const file of ['patcher.js', 'preload.js', 'renderer.js', 'renderer.css']) {
    const content = await readFile(join(output, 'dist', file));
    files[file] = { sha256: createHash('sha256').update(content).digest('hex'), bytes: (await stat(join(output, 'dist', file))).size };
}
await writeFile(join(output, 'build.json'), JSON.stringify({ name: 'Focus', version: '0.2.0', target: 'discord-desktop',
    upstream, builtAt: new Date().toISOString(), updaterDisabled: true,
    updater: { provider: 'github', repository: '9999yukee/Focus', assetPattern: 'Focus-{version}-Setup.exe' }, files }, null, 2));
console.log(`Focus Desktop built: ${output}`);
