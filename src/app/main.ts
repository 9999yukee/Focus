import '../styles/app.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { icon } from '../components/icons';
import { button, element, toast } from '../components/dom';
import { native, settingsStore } from '../stores/settings';
import type { ResourcePolicy, Settings } from '../settings/types';
import { appearance, hiddenPage, pageHeader, simplePage } from '../views/settings';
import type { Navigation, SettingsPage } from '../views/settings';
import { performancePage } from '../views/performance';
import { viewportLab } from '../views/viewport-lab';
import { performanceMonitor, memory, number } from '../performance/PerformanceMonitor';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="titlebar"><div class="brand-mark">${icon('focus', 22)}</div><div class="drag-area" data-tauri-drag-region><span class="brand">Focus</span><span class="title-divider"></span><span id="page-title">Communication, simplified.</span></div><div class="top-actions"><button class="top-settings" id="open-settings">${icon('settings', 15)}<span>Settings</span><kbd>Ctrl ,</kbd></button><span class="window-divider"></span><button class="window-control" data-action="minimize" aria-label="Minimize">${icon('minus', 15)}</button><button class="window-control" data-action="maximize" aria-label="Maximize or restore">${icon('square', 13)}</button><button class="window-control" data-action="close" aria-label="Close Focus">${icon('close', 17)}</button></div></header>
  <aside class="rail" aria-label="Focus navigation"><div class="rail-top"><button class="rail-button active" data-page="chat" aria-label="Discord" title="Discord">${icon('chat')}</button><div class="rail-separator"></div><button class="rail-button" data-page="hidden" aria-label="Hidden items" title="Hidden items">${icon('hidden')}<span id="hidden-dot" hidden></span></button></div><div class="rail-bottom"><button class="rail-button" data-page="performance" aria-label="Performance" title="Performance">${icon('performance')}</button><button class="rail-button" data-page="appearance" aria-label="Settings" title="Settings">${icon('settings')}</button></div></aside>
  <main id="content"></main>
  <footer class="statusbar"><span class="status-connection"><i></i><span id="connection-label">Connecting to Discord</span></span><button id="hidden-notice" hidden></button><span class="status-spacer"></span><button id="live-summary" hidden></button><span id="resource-label">Active</span><span class="footer-divider"></span><span>Focus 0.1.0</span></footer>
`;
const content = document.querySelector<HTMLElement>('#content')!;
const title = document.querySelector<HTMLElement>('#page-title')!;
let currentPage: SettingsPage | 'chat' = 'chat';
let disposePage: (() => void) | undefined;
let viewSequence = 0;
let ready = false;
const navItems: [SettingsPage, string, string][] = [['account', 'account', 'Account'], ['audio', 'audio', 'Audio & Video'], ['notifications', 'notifications', 'Notifications'], ['privacy', 'privacy', 'Privacy'], ['appearance', 'appearance', 'Appearance'], ['performance', 'performance', 'Performance']];

async function nativeAction(command: string, args?: Record<string, unknown>): Promise<void> {
  if (!native) { toast('This control is available in the Windows app.'); return; }
  try { await invoke(command, args); } catch (error) { toast(String(error)); }
}

const navigation: Navigation = {
  page: (page) => { void showPage(page); },
  discordSettings: () => { void showPage('chat').then(() => nativeAction('navigate_discord', { destination: 'settings' })); },
};

async function showPage(page: SettingsPage | 'chat'): Promise<void> {
  const sequence = ++viewSequence;
  if (native) {
    try { await invoke('set_view', { visible: page === 'chat' }); }
    catch (error) { toast(String(error)); return; }
  }
  if (sequence !== viewSequence) return;
  disposePage?.(); disposePage = undefined; currentPage = page;
  title.textContent = page === 'chat' ? 'Communication, simplified.' : 'Settings';
  document.querySelectorAll<HTMLElement>('.rail-button').forEach(node => node.classList.toggle('active', node.dataset.page === page || (node.dataset.page === 'appearance' && ['account', 'audio', 'notifications', 'privacy'].includes(page))));
  content.replaceChildren();
  if (page === 'chat') {
    const state = element('div', 'connection-state');
    const mark = element('div', 'connection-mark'); mark.innerHTML = icon('focus', 48);
    state.append(mark, element('div', 'eyebrow', 'COMMUNICATION, SIMPLIFIED'), element('h1', '', native ? 'Your space is opening.' : 'Meet Focus.'), element('p', '', native ? 'Discord loads here, with its normal sign-in and call controls.' : 'The lightweight Windows shell for Discord. This browser preview shows Focus settings; the desktop app hosts Discord in WebView2.'));
    const actions = element('div', 'row-actions');
    actions.append(button(native ? 'Reload Discord' : 'Explore settings', () => native ? void nativeAction('navigate_discord', { destination: 'reload' }) : navigation.page('appearance'), 'button primary'), button('Settings', () => navigation.page('appearance'), 'button secondary'));
    state.append(actions); content.append(state); return;
  }
  const settings = element('div', 'settings-layout'); const sidebar = element('aside', 'settings-sidebar');
  sidebar.append(element('div', 'sidebar-label', 'SETTINGS'));
  const nav = element('nav', 'settings-nav'); nav.setAttribute('aria-label', 'Settings categories');
  for (const [key, glyph, label] of navItems) {
    const item = button('', () => navigation.page(key), `settings-nav-item${key === page || (page === 'hidden' && key === 'privacy') || (page === 'lab' && key === 'performance') ? ' selected' : ''}`);
    item.innerHTML = `${icon(glyph, 18)}<span>${label}</span>`;
    if (item.classList.contains('selected')) item.setAttribute('aria-current', 'page');
    nav.append(item);
  }
  sidebar.append(nav);
  const back = button('', () => navigation.page('chat'), 'back-to-discord'); back.innerHTML = `${icon('back', 16)}<span>Back to Discord</span><kbd>Esc</kbd>`;
  sidebar.append(back);
  const foot = element('div', 'sidebar-foot'); foot.innerHTML = `<div class="sidebar-wordmark">${icon('focus', 17)}<span>Focus</span><span class="version">/ 0.1</span></div><p>Only what matters.</p>`; sidebar.append(foot);
  const scroll = element('div', 'settings-scroll'); const body = element('div', 'settings-body'); body.append(pageHeader(page));
  if (page === 'appearance') body.append(appearance());
  else if (page === 'hidden') body.append(hiddenPage(navigation));
  else if (page === 'performance') { const view = performancePage(navigation); body.append(view.node); disposePage = view.dispose; }
  else if (page === 'lab') { const view = viewportLab(); body.append(view.node); disposePage = view.dispose; }
  else body.append(simplePage(page, navigation));
  scroll.append(body); settings.append(sidebar, scroll); content.append(settings);
}

for (const control of document.querySelectorAll<HTMLButtonElement>('[data-action]')) control.addEventListener('click', () => { void nativeAction('window_action', { action: control.dataset.action }); });
for (const control of document.querySelectorAll<HTMLButtonElement>('[data-page]')) control.addEventListener('click', () => navigation.page(control.dataset.page as SettingsPage | 'chat'));
document.querySelector('#open-settings')!.addEventListener('click', () => navigation.page('appearance'));
document.querySelector('#live-summary')!.addEventListener('click', () => navigation.page('performance'));
document.querySelector('#hidden-notice')!.addEventListener('click', () => navigation.page('hidden'));
document.querySelector('.drag-area')!.addEventListener('mousedown', event => { if (native && (event as MouseEvent).button === 0) void getCurrentWindow().startDragging(); });
document.querySelector('.drag-area')!.addEventListener('dblclick', () => { void nativeAction('window_action', { action: 'maximize' }); });
document.addEventListener('keydown', event => {
  if (event.ctrlKey && event.key === ',') { event.preventDefault(); navigation.page('appearance'); }
  if (event.key === 'Escape' && currentPage !== 'chat') navigation.page('chat');
});

function setStatus(status: string): void {
  const label = document.querySelector<HTMLElement>('#connection-label')!;
  if (status === 'settings-unavailable') { toast('Open Discord’s settings using the gear beside your profile. The shortcut is unavailable in this layout or before sign-in.'); return; }
  if (status === 'hidden-unavailable') { toast('This item is not loaded in Discord navigation. Restore it to navigate normally.'); return; }
  ready = status === 'ready'; label.textContent = ready ? 'Discord web' : 'Loading Discord';
}
function setUnread(count: number): void {
  const notice = document.querySelector<HTMLButtonElement>('#hidden-notice')!; notice.hidden = count === 0;
  notice.textContent = `${count} hidden conversation${count === 1 ? '' : 's'} with unread indicators`;
  (document.querySelector('#hidden-dot') as HTMLElement).hidden = count === 0;
}
function setPolicy(policy: ResourcePolicy): void {
  document.querySelector('#resource-label')!.textContent = policy.state === 'FOCUSED' ? 'Active' : policy.state === 'MINIMIZED' ? 'Minimized' : 'Background';
}
performanceMonitor.subscribe(() => {
  const summary = document.querySelector<HTMLButtonElement>('#live-summary')!; summary.hidden = !performanceMonitor.enabled;
  summary.textContent = `${memory(performanceMonitor.sample?.workingSetBytes)} · ${number(performanceMonitor.sample?.cpuPercent, '% CPU')}${performanceMonitor.recording ? ' · Recording' : ''}`;
});

async function start(): Promise<void> {
  try {
    await settingsStore.load();
    if (native) {
      await Promise.all([
        listen<string>('discord-status', event => setStatus(event.payload)),
        listen<Settings>('settings-changed', event => settingsStore.receive(event.payload)),
        listen<number>('hidden-unread', event => setUnread(event.payload)),
        listen<ResourcePolicy>('resource-policy', event => setPolicy(event.payload)),
      ]);
      const status = await invoke<{ discordReady: boolean; policy: ResourcePolicy; hiddenUnread: number; startInSettings: boolean }>('get_status');
      setStatus(status.discordReady ? 'ready' : 'loading'); setUnread(status.hiddenUnread); setPolicy(status.policy);
      await showPage(status.startInSettings ? 'appearance' : 'chat');
    } else {
      document.querySelector('#connection-label')!.textContent = 'Browser preview';
      await showPage('appearance');
    }
  } catch (error) {
    content.replaceChildren(element('div', 'startup-error', `Focus could not open: ${String(error)}`));
  }
}
void start();
