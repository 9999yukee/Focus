import { chromium } from 'playwright';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const bundle = await build({ stdin: { contents: `
    import { Concealment } from './desktop/plugin/conceal';
    import { defaults } from './desktop/plugin/model';
    import { themeCss } from './desktop/plugin/theme';
    const style = document.createElement('style'); style.textContent = themeCss({ ...defaults, theme: 'black' }); document.head.append(style);
    window.pref = structuredClone(defaults);
    window.focusTest = new Concealment(window.pref);
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife' });
const browser = await chromium.launch({ headless: true,
    ...(existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe') ? { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {}) });
const checks = [], errors = [];
try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(`<!doctype html><html><head><style>
        nav{display:flex;flex-direction:column;gap:8px;width:150px} .listItem_fixture{height:48px;background:#ddd} .channel_fixture{height:36px}
        .backdrop{position:fixed;inset:0;background:#0008} [role=dialog]{background:white;color:black;padding:20px}
    </style></head><body><nav aria-label="Serveurs">
      <div class="listItem_fixture" id="guild-row"><div class="pill">Unread</div><div><div data-list-item-id="guildsnav___12345678901234567" aria-label="Fixture server" tabindex="0">Hidden guild</div></div></div>
      <div class="listItem_fixture" id="other-row"><div data-list-item-id="guildsnav___22345678901234567" tabindex="0">Visible guild</div></div>
      <div role="group" id="folder"><div class="listItem_fixture" id="nested-row"><div data-list-item-id="guildsnav___32345678901234567">Nested</div></div><div class="listItem_fixture" id="nested-visible"><div data-list-item-id="guildsnav___42345678901234567">Nested visible</div></div></div>
      <div class="listItem_fixture" id="discover-row"><div data-list-item-id="guildsnav___guild-discover-button">Discovery</div></div>
    </nav><nav class="privateChannels_fixture">
      <div class="channel_fixture" id="dm-row"><a href="/channels/@me/52345678901234567">Hidden DM</a><span>Badge</span></div>
      <div class="channel_fixture" id="shop-row"><a href="/shop" data-list-item-id="private-channels-uid_47___shop">Shop</a></div>
    </nav><main><div class="peopleList_fixture"><div class="peopleListItem_fixture" id="friend-row"><div data-list-item-id="people-list___62345678901234567">Friend</div></div></div>
    <div role="tablist"><button role="tab" data-tab-id="nitro" id="nitro">Nitro</button><button role="tab" data-tab-id="voice_video" id="voice">Audio</button><button role="tab" data-tab-id="billing" id="billing">Billing</button></div>
    <div id="chat-messages-111"><a href="/shop" id="message-link">Someone posted a shop link</a><p id="message-text">Quests and Nitro mentioned in a normal message</p></div>
    <button id="essential">Essential control</button><div class="questBar_fixture" id="quest-bar">Quest promotion</div>
    <div data-testid="quest-bar-container" id="quest-complete"><button>Récupérer la récompense</button></div>
    <aside class="nowPlayingColumn_fixture" id="online-panel">En ligne</aside>
    <aside class="userPanelOuter_fixture" id="dm-profile-panel">Profil latéral</aside>
    <button class="lookFilled_fixture colorBrand_fixture" id="primary-action">Ajouter</button>
    <img id="color-avatar" class="avatar_fixture" alt="Fixture avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpath fill='red' d='M0 0h10v10H0z'/%3E%3C/svg%3E">
    <div class="backdrop" id="quest-layer"><section role="dialog" aria-labelledby="quest-heading"><h2 id="quest-heading">Quêtes Discord</h2><button aria-label="Fermer" onclick="document.getElementById('quest-layer').remove();document.getElementById('essential').focus()">×</button></section></div>
    </main></body></html>`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => {
        window.pref.hidden = [
            { kind: 'server', id: '12345678901234567', label: 'Fixture' },
            { kind: 'server', id: '32345678901234567', label: 'Nested' },
            { kind: 'conversation', id: '52345678901234567', label: 'DM' },
            { kind: 'friend', id: '62345678901234567', label: 'Friend' }
        ];
        window.focusTest.configure(window.pref);
    });
    for (const id of ['guild-row', 'nested-row', 'dm-row', 'friend-row', 'shop-row', 'discover-row', 'nitro', 'quest-bar', 'quest-complete', 'online-panel', 'dm-profile-panel']) {
        assert.equal(await page.locator(`#${id}`).isVisible(), false, `${id} must disappear completely`);
        assert.equal(await page.locator(`#${id}`).evaluate(node => node.getBoundingClientRect().height), 0);
    }
    checks.push('Full rows collapse: server/pill/folder child/DM/friend/promotions/settings tabs');
    const palette = await page.evaluate(() => ({
        avatarFilter: getComputedStyle(document.getElementById('color-avatar')).filter,
        bodyFilter: getComputedStyle(document.body).filter,
        button: getComputedStyle(document.getElementById('primary-action')).backgroundColor,
        text: getComputedStyle(document.getElementById('primary-action')).color
    }));
    assert.deepEqual(palette, { avatarFilter: 'none', bodyFilter: 'none', button: 'rgb(255, 255, 255)', text: 'rgb(0, 0, 0)' });
    checks.push('Completed quest, friends panel and DM sidebar collapse; Focus buttons retain contrast without filtering avatars');
    for (const id of ['other-row', 'nested-visible', 'voice', 'billing', 'message-link', 'message-text'])
        assert.equal(await page.locator(`#${id}`).isVisible(), true, `${id} must remain`);
    checks.push('Sibling servers, native audio/billing and ordinary message links preserved');
    assert.equal(await page.locator('#quest-layer').count(), 0);
    await page.locator('#essential').click();
    checks.push('Quest modal closes together with backdrop and focus trap');
    await page.evaluate(() => {
        const dialog = document.createElement('section'); dialog.id = 'ordinary-dialog'; dialog.role = 'dialog'; dialog.setAttribute('aria-label', 'Audio settings');
        dialog.innerHTML = '<button>Close</button>'; document.body.append(dialog);
        document.querySelector('#guild-row [data-list-item-id]').setAttribute('data-list-item-id', 'guildsnav___72345678901234567');
    });
    await page.waitForFunction(() => !document.getElementById('guild-row').hasAttribute('data-focus-concealed'));
    assert.equal(await page.locator('#guild-row').isVisible(), true);
    assert.equal(await page.locator('#ordinary-dialog').isVisible(), true);
    checks.push('Recycled row identity restores visibility; unrelated dialog preserved');
    await page.evaluate(() => {
        const row = document.createElement('div'); row.className = 'listItem_fixture'; row.id = 'late-row';
        row.innerHTML = '<div data-list-item-id="guildsnav___12345678901234567">New mount of hidden server</div>';
        document.querySelector('nav').append(row);
    });
    await page.waitForFunction(() => document.getElementById('late-row').hasAttribute('data-focus-concealed'));
    checks.push('Late mounts and navigation changes retain local concealment');
    await page.evaluate(() => { window.pref.hidden = []; window.pref.hidePromotions = false; window.focusTest.configure(window.pref); });
    for (const id of ['late-row', 'nested-row', 'friend-row', 'dm-row', 'shop-row', 'discover-row', 'nitro', 'quest-bar'])
        assert.equal(await page.locator(`#${id}`).isVisible(), true);
    checks.push('Restore and disable filters recover rows and original spacing');
    await page.evaluate(() => { window.pref.hidePromotions = true; window.focusTest.configure(window.pref); window.focusTest.dispose(); });
    assert.equal(await page.locator('[data-focus-concealed]').count(), 0);
    checks.push('Plugin stop removes every visibility mark');
    assert.deepEqual(errors, []);
    await mkdir('artifacts/test-results', { recursive: true });
    await writeFile('artifacts/test-results/desktop.json', JSON.stringify({ passed: true, fixture: true, liveAccountTested: false, checks }, null, 2));
    console.log(`Desktop integration fixtures: ${checks.length} groups passed.`);
} finally { await browser.close(); }
