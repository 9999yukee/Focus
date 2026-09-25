// SPDX-License-Identifier: GPL-3.0-or-later
import { app, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { get } from 'https';
import { spawn } from 'child_process';
import { dirname, join } from 'path';

const windows = new Map<number, { title: string; setter: (title: string) => void; listener: (event: Electron.Event) => void }>();
function setWindowsIdentity(window: BrowserWindow, enabled: boolean): void {
    if (process.platform !== 'win32') return;
    const discordRoot = dirname(dirname(app.getPath('exe')));
    const icon = enabled ? join(__dirname, '..', 'Focus.ico') : join(discordRoot, 'app.ico');
    window.setIcon(icon);
    window.setAppDetails({
        appId: enabled ? 'Focus.DiscordDesktop' : 'com.squirrel.Discord.Discord',
        appIconPath: icon,
        appIconIndex: 0,
        relaunchCommand: `"${join(discordRoot, 'Update.exe')}" --processStart Discord.exe`,
        relaunchDisplayName: enabled ? 'Focus' : 'Discord'
    });
}
function windowFor(event: IpcMainInvokeEvent): BrowserWindow {
    const frame = event.senderFrame;
    if (!frame || frame !== event.sender.mainFrame || new URL(frame.url).origin !== 'https://discord.com')
        throw new Error('Focus is restricted to the main Discord window.');
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) throw new Error('Discord window unavailable.');
    return window;
}
export function setBranding(event: IpcMainInvokeEvent, enabled: boolean): void {
    const window = windowFor(event);
    if (typeof enabled !== 'boolean') throw new Error('Invalid branding setting.');
    const previous = windows.get(window.id);
    if (enabled && !previous) {
        const setter = window.setTitle;
        const listener = (e: Electron.Event) => { e.preventDefault(); window.setTitle('Focus'); };
        windows.set(window.id, { title: window.getTitle(), setter, listener });
        // Discord also calls setTitle directly, independently of page-title-updated.
        window.setTitle = () => setter.call(window, 'Focus');
        window.on('page-title-updated', listener);
        window.once('closed', () => windows.delete(window.id));
        window.setTitle('Focus');
        setWindowsIdentity(window, true);
    } else if (enabled) {
        window.setTitle('Focus');
        setWindowsIdentity(window, true);
    } else if (previous) {
        window.removeListener('page-title-updated', previous.listener);
        window.setTitle = previous.setter;
        window.setTitle(previous.title); windows.delete(window.id);
        setWindowsIdentity(window, false);
    }
}
export function metrics(event: IpcMainInvokeEvent) {
    windowFor(event);
    const processes = app.getAppMetrics();
    return {
        processes: processes.length,
        workingSetMiB: processes.reduce((sum, process) => sum + process.memory.workingSetSize, 0) / 1024,
        cpuPercent: processes.reduce((sum, process) => sum + process.cpu.percentCPUUsage, 0),
        at: Date.now()
    };
}
function download(url: string, redirects = 0): Promise<Buffer> {
    const parsed = new URL(url);
    const allowed = parsed.protocol === 'https:' &&
        ((parsed.hostname === 'github.com' && parsed.pathname.startsWith('/9999yukee/Focus/releases/download/')) ||
            ['objects.githubusercontent.com', 'github-releases.githubusercontent.com', 'release-assets.githubusercontent.com'].includes(parsed.hostname));
    if (!allowed)
        return Promise.reject(new Error('Updater URL refused.'));
    return new Promise((resolve, reject) => {
        get(url, { headers: { 'User-Agent': 'Focus-updater' } }, response => {
            if ([301, 302, 307, 308].includes(response.statusCode ?? 0) && response.headers.location && redirects < 3) {
                response.resume();
                download(response.headers.location, redirects + 1).then(resolve, reject);
                return;
            }
            if (response.statusCode !== 200) { response.resume(); reject(new Error(`Download failed (${response.statusCode}).`)); return; }
            const chunks: Buffer[] = [];
            response.on('data', chunk => chunks.push(Buffer.from(chunk)));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}
export async function downloadAndInstall(event: IpcMainInvokeEvent, installerUrl: string, checksumUrl: string): Promise<void> {
    windowFor(event);
    const [installer, checksum] = await Promise.all([download(installerUrl), download(checksumUrl)]);
    const expected = checksum.toString('utf8').match(/^[a-f0-9]{64}/im)?.[0]?.toLowerCase();
    const actual = createHash('sha256').update(installer).digest('hex');
    if (!expected || expected !== actual) throw new Error('Updater checksum mismatch.');
    const installerPath = join(app.getPath('temp'), `Focus-${actual}.exe`);
    await fs.writeFile(installerPath, installer);
    const child = spawn(installerPath, [], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
    setTimeout(() => app.quit(), 100);
}
