import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

await mkdir('artifacts/screenshots', { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(edge) ? { executablePath: edge } : {}) });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 780 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:1420');
  await page.getByRole('heading', { name: 'Appearance', exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/screenshots/appearance-browser-preview.png' });
  await page.getByRole('button', { name: 'White theme', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'white');
  await page.screenshot({ path: 'artifacts/screenshots/white-browser-preview.png' });
  await page.getByRole('button', { name: 'Black theme', exact: true }).click();
  await page.getByRole('switch', { name: 'Show avatars', exact: true }).click();
  assert.equal(await page.getByRole('switch', { name: 'Show avatars', exact: true }).getAttribute('aria-checked'), 'false');
  await page.getByRole('button', { name: 'Hidden items', exact: true }).click();
  await page.getByRole('heading', { name: 'Everything is in view.' }).waitFor();
  await page.getByRole('navigation', { name: 'Settings categories' }).getByRole('button', { name: 'Performance', exact: true }).click();
  await page.getByRole('button', { name: 'Open viewport lab' }).click();
  await page.getByRole('button', { name: 'Jump to row 15,000' }).click();
  await page.waitForFunction(() => document.querySelector('.lab-index')?.textContent?.startsWith('149'));
  assert.ok(await page.locator('.lab-row').count() <= 80);
  assert.ok(await page.locator('.lab-row').count() > 0);
  await page.screenshot({ path: 'artifacts/screenshots/viewport-lab-browser-preview.png' });
  await page.setViewportSize({ width: 760, height: 520 });
  await page.getByRole('navigation', { name: 'Settings categories' }).getByRole('button', { name: 'Appearance' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator('.settings-scroll').evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
  await page.screenshot({ path: 'artifacts/screenshots/small-window-browser-preview.png' });

  // A controlled DOM fixture, never real account data or a production Discord adapter.
  const fixture = await browser.newContext();
  await fixture.route('**/*', route => {
    if (route.request().isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><title>Focus bridge test fixture</title></head><body>
      <nav><div data-list-item-id="guildsnav___12345678901234567" aria-label="Fixture server" tabindex="0">Server</div><a href="/channels/@me/23456789012345678" aria-label="Fixture conversation">DM</a><a href="/shop">Shop</a><a href="/discovery">Discovery</a><a href="/store">Nitro</a><a href="/quest-home">Quests</a></nav>
      <main><div data-list-item-id="people-list___34567890123456789" aria-label="Fixture friend">Friend</div><div id="chat-messages-123"><p>Boosted-server voice bitrate control is preserved</p><video id="attachment"></video></div><video id="call"></video></main></body></html>` });
    return route.abort();
  });
  await fixture.addInitScript(() => {
    window.testCalls = [];
    window.__TAURI_INTERNALS__ = { invoke: async (command, args) => { window.testCalls.push({ command, args }); } };
  });
  await fixture.addInitScript({ content: await readFile('src-tauri/bridge.js', 'utf8') });
  const remote = await fixture.newPage();
  remote.on('pageerror', error => errors.push(error.message));
  await remote.goto('https://discord.com/app');
  await remote.waitForFunction(() => window.__FOCUS__ !== undefined);
  assert.equal(await remote.getByRole('link', { name: 'Shop', exact: true }).isVisible(), false);
  assert.equal(await remote.getByRole('link', { name: 'Discovery', exact: true }).isVisible(), false);
  assert.equal(await remote.getByText('Boosted-server voice bitrate control is preserved').isVisible(), true);
  await remote.getByText('Server', { exact: true }).click({ button: 'right', modifiers: ['Shift'] });
  await remote.getByRole('menuitem', { name: 'Hide server in Focus' }).click();
  assert.equal(await remote.evaluate(() => window.testCalls.find(call => call.command === 'bridge_hide').args.item.id), '12345678901234567');
  // Normal Discord context menus keep their original actions.
  await remote.getByText('DM', { exact: true }).click({ button: 'right' });
  await remote.evaluate(() => { const menu = document.createElement('div'); menu.role = 'menu'; menu.innerHTML = '<button role="menuitem">Mute</button>'; document.body.append(menu); });
  await remote.getByRole('menuitem', { name: 'Hide conversation in Focus' }).waitFor();
  assert.equal(await remote.getByRole('menuitem', { name: 'Mute', exact: true }).isVisible(), true);
  await remote.evaluate(() => {
    const attachment = document.querySelector('#attachment'), call = document.querySelector('#call');
    window.pauseCounts = { attachment: 0, call: 0 };
    attachment.pause = () => { window.pauseCounts.attachment++; };
    call.pause = () => { window.pauseCounts.call++; };
    Object.defineProperty(attachment, 'paused', { get: () => false });
    call.srcObject = new MediaStream();
    window.__FOCUS__.setPolicy({ state: 'MINIMIZED', pauseCosmetics: true, pauseAttachmentVideo: true, preserveRealtime: true, viewVisible: false });
  });
  const pauses = await remote.evaluate(() => window.pauseCounts);
  assert.ok(pauses.attachment > 0); assert.equal(pauses.call, 0);
  await remote.goto('https://example.com/');
  assert.equal(await remote.evaluate(() => window.__FOCUS__ === undefined), true);
  assert.deepEqual(errors, []);
  const report = { passed: true, checks: ['theme changes', 'setting toggles', 'empty hidden list', '30,000-row bounded viewport', 'small window overflow', 'promotion selectors', 'local context action', 'original context menu preserved', 'attachment-only minimize policy', 'origin guard', 'no browser exceptions'], measuredAt: new Date().toISOString() };
  await mkdir('artifacts/test-results', { recursive: true });
  await writeFile('artifacts/test-results/ui.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
