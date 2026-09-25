// Run against a locally launched diagnostic window. Read UI structure only, not account content.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = 'http://127.0.0.1:9223';
const deadline = Date.now() + 45000;
let browser;
while (Date.now() < deadline) {
    try { browser = await chromium.connectOverCDP(endpoint); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 250)); }
}
if (!browser) throw new Error('Diagnostic Focus window unavailable');
const failures = [];
try {
    const context = browser.contexts()[0];
    let page;
    while (Date.now() < deadline) {
        page = context.pages().find(page => page.url().startsWith('https://discord.com/'));
        if (page) break;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!page) throw new Error('Main Focus page unavailable');
    page.on('pageerror', error => {
        // Vencord NoTrack deliberately aborts Sentry initialization with this exact signal.
        if (error.message === 'Sentry successfully disabled') return;
        failures.push(error.name + ': ' + error.message.replace(/\b\d{17,20}\b/g, '[id]').slice(0,240));
    });
    page.on('console', message => {
        if (message.type() !== 'error') return;
        const match = message.text().match(/(?:ReferenceError: [\w$]+ is not defined|TypeError: Cannot read properties of (?:null|undefined)[^\n]{0,120}|Minified React error #[0-9]+)/);
        if (match) failures.push(match[0]);
    });
    const ready = await page.waitForFunction(() =>
        globalThis.Vencord?.Plugins?.plugins?.Focus?.started
        && document.querySelector('[data-list-item-id="guildsnav___home"]')
        && document.querySelector('[class*="panels_"]')
        && document.querySelectorAll('[data-list-item-id]').length > 1
        && !document.querySelector('[class*="errorPage"]'), {}, { timeout: 30000 }).then(() => true, () => false);
    // Keep observing after mount; the previous check stopped before the root render failed.
    if (ready) await page.waitForTimeout(6000);
    const state = await page.evaluate(() => ({
        title: document.title,
        focusStarted: !!globalThis.Vencord?.Plugins?.plugins?.Focus?.started,
        themePresent: !!document.getElementById('focus-desktop-theme'),
        navigationPresent: !!document.querySelector('[data-list-item-id="guildsnav___home"]'),
        accountControlsPresent: !!document.querySelector('[class*="panels_"]'),
        navigationItemCount: document.querySelectorAll('[data-list-item-id]').length,
        crashPagePresent: !!document.querySelector('[class*="errorPage"]'),
        bodyFilter: getComputedStyle(document.body).filter
    }));
    const report = { at: new Date().toISOString(), passed: ready && state.navigationPresent && state.accountControlsPresent
        && state.navigationItemCount > 1 && !state.crashPagePresent && !failures.length,
        ...state, failures: [...new Set(failures)], accountContentRead: false };
    await mkdir('artifacts/test-results', { recursive: true });
    await writeFile('artifacts/test-results/desktop-render-startup.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); }
