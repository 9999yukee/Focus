import { button, element, toast } from '../components/dom';
import { icon } from '../components/icons';
import { callout, fact, group, row, selectSetting, toggle } from '../components/settings-controls';
import { native, settingsStore } from '../stores/settings';
import { invoke } from '@tauri-apps/api/core';

export type SettingsPage = 'account' | 'audio' | 'notifications' | 'privacy' | 'appearance' | 'performance' | 'hidden' | 'lab';
export interface Navigation { page(page: SettingsPage | 'chat'): void; discordSettings(): void }

const titles: Record<SettingsPage, [string, string]> = {
  account: ['Account', 'Your conversations. Your account.'],
  audio: ['Audio & Video', 'Be heard. Stay connected.'],
  notifications: ['Notifications', 'Stay in the loop, on your terms.'],
  privacy: ['Privacy', 'Keep control of your space.'],
  appearance: ['Appearance', 'A quieter space, made yours.'],
  performance: ['Performance', 'Keep the conversation light.'],
  hidden: ['Hidden items', 'Out of sight. Always within reach.'],
  lab: ['Viewport lab', 'A renderer experiment, measured in real time.'],
};
export function pageHeader(page: SettingsPage): HTMLElement {
  const header = element('header', 'page-header');
  const crumb = element('div', 'eyebrow', page === 'hidden' ? 'PRIVACY / HIDDEN ITEMS' : page === 'lab' ? 'PERFORMANCE / EXPERIMENT' : 'YOUR PREFERENCES');
  const title = element('div', 'title-line'); title.append(element('h1', '', titles[page][0]));
  const badge = element('span', 'local-badge'); badge.innerHTML = `${icon('check', 12)} ${native ? 'Saved on this device' : 'Browser preview'}`; title.append(badge);
  header.append(crumb, title, element('p', 'page-description', titles[page][1])); return header;
}

export function appearance(): HTMLElement {
  const root = element('div');
  const themes = group('Theme', 'Three shades. Nothing extra.');
  const choices = element('div', 'theme-choices');
  const values = ['black', 'gray', 'white'] as const;
  for (const value of values) {
    const label = value[0].toUpperCase() + value.slice(1);
    const choice = button('', () => { void settingsStore.update('theme', value).then(() => updateSelection()); }, `theme-choice preview-${value}`);
    choice.setAttribute('aria-label', `${label} theme`); choice.setAttribute('aria-pressed', String(settingsStore.get().theme === value)); choice.dataset.themeChoice = value;
    choice.innerHTML = `<span class="theme-preview"><span class="mini-rail"><i></i><i></i><i></i></span><span class="mini-nav"><i></i><i></i><i></i><i></i></span><span class="mini-chat"><i></i><i></i><i></i><i></i><i></i></span></span><span class="theme-label">${label}<span class="theme-check">${icon('check', 14)}</span></span>`;
    choices.append(choice);
  }
  function updateSelection(): void { for (const choice of choices.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')) choice.setAttribute('aria-pressed', String(choice.dataset.themeChoice === settingsStore.get().theme)); }
  themes.append(choices); root.append(themes);
  const layout = group('Layout');
  layout.append(selectSetting('density', 'Message spacing', 'Keep things compact, or give messages a little room.', [{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }]), toggle('showAvatars', 'Show avatars', 'A familiar face beside each message.'));
  root.append(layout);
  const motion = group('Motion & media');
  motion.append(toggle('reduceMotion', 'Reduce motion', 'Keep transitions and interface animations still.'), toggle('animatedAvatars', 'Animated avatars', 'Allow animation for supported Discord GIF avatars.'), toggle('animatedEmoji', 'Animated emoji', 'Allow animation for supported Discord GIF emoji.'), toggle('showEmbeds', 'Show embeds', 'Display rich link previews in conversations.'), toggle('showStickers', 'Show stickers', 'Display stickers in the message list.'));
  root.append(motion, callout('Quiet by design', 'Focus keeps the entire experience monochrome, including images and video. Your theme only changes this device.'));
  return root;
}

export function simplePage(page: SettingsPage, navigation: Navigation): HTMLElement {
  const root = element('div');
  const discordButton = () => navigation.discordSettings();
  if (page === 'account') {
    const section = group('Connected through Discord');
    section.append(fact('Normal Discord sign-in', 'Sign in, use a passkey, or scan the QR code in the Discord page.', 'Official page'), fact('Your credentials stay with Discord', 'Focus never reads passwords, cookies, or account tokens.', 'Private'));
    root.append(section, callout('Manage your account', 'Change your profile, security settings, or sign out using Discord’s account controls.', { label: 'Open Discord settings', run: discordButton }));
    const behavior = group('Window'); behavior.append(toggle('closeToTray', 'Keep Focus in the tray', 'Closing the window keeps calls and Discord running. Use Quit Focus in the tray to exit.')); root.append(behavior);
  } else if (page === 'audio') {
    const section = group('Call controls');
    section.append(fact('Microphone & speakers', 'Choose devices, adjust levels, and test your microphone in Discord.', 'Discord controls'), fact('Camera & screen sharing', 'Use the call controls in Discord. Availability depends on WebView2 and device permissions.', 'Discord controls'), fact('Keep calls connected', 'Focus does not suspend the Discord page or stop live media streams when minimized.', 'Always on'));
    root.append(section, callout('Your voice comes first', 'Noise suppression, echo cancellation, device selection, and call quality stay with Discord.', { label: 'Open audio settings', run: discordButton }));
  } else if (page === 'notifications') {
    const section = group('Choose what reaches you');
    section.append(toggle('desktopNotifications', 'Allow desktop notifications', 'Allow Discord web notifications on this device. Restart Focus after changing this permission.'));
    section.append(fact('Messages & mentions', 'Discord controls notification preferences and permission requests.', 'Discord controls'), fact('Muted servers & conversations', 'Use Discord’s normal context menu to mute or mark as read.', 'Discord controls'), fact('Hidden conversations', 'Focus shows a subtle count when an unread indicator is available in hidden navigation.', 'Local indicator'));
    root.append(section, callout('Notification delivery', 'Allow notifications here, restart Focus, then enable desktop notifications in Discord. Windows settings also apply. Notifications require Focus to remain running.', { label: 'Open notification settings', run: discordButton }));
  } else if (page === 'privacy') {
    const section = group('Your local space');
    const hidden = row('Hidden items', `${settingsStore.get().hiddenServers.length} servers · ${settingsStore.get().hiddenFriends.length} friends & conversations`);
    hidden.append(button('Manage hidden items', () => navigation.page('hidden'), 'button secondary')); section.append(hidden);
    section.append(toggle('hidePromotions', 'Hide promotional navigation', 'Hide supported Nitro, Shop, Quests, Discovery, and boost marketing elements.'));
    root.append(section);
    const privacy = group('A small footprint');
    privacy.append(fact('No Focus analytics', 'There is no Focus tracking service or telemetry upload.', 'Off'), fact('Local preferences', 'Appearance and hidden-item choices are stored on this Windows account.', 'On device'), fact('Discord’s privacy controls', 'Manage friend requests, message permissions, and data settings in Discord.', 'Discord controls'));
    root.append(privacy, callout('Discord remains connected', 'Hiding changes navigation only. Your memberships, friendships, messages, and Discord data policies remain in effect.', { label: 'Discord privacy settings', run: discordButton }));
  }
  return root;
}

export function hiddenPage(navigation: Navigation): HTMLElement {
  const root = element('div');
  const stats = element('div', 'hidden-stats');
  for (const [count, label] of [[settingsStore.get().hiddenServers.length, 'Servers'], [settingsStore.get().hiddenFriends.length, 'Friends & DMs']] as const) {
    const stat = element('div'); stat.append(element('strong', '', String(count)), element('span', '', label)); stats.append(stat);
  }
  root.append(stats);
  const items = [...settingsStore.get().hiddenServers, ...settingsStore.get().hiddenFriends];
  if (!items.length) {
    const empty = element('div', 'empty-state'); const glyph = element('div', 'empty-icon'); glyph.innerHTML = icon('hidden', 30);
    empty.append(glyph, element('h2', '', 'Everything is in view.'), element('p', '', 'Right-click a server, friend, or conversation in Discord and choose “Hide in Focus”. Shift + right-click opens the Focus menu directly.'), button('Back to Discord', () => navigation.page('chat'), 'button primary'));
    root.append(empty);
  } else {
    const list = group('Hidden on this device');
    for (const item of items) {
      const node = row(item.label || `${item.kind} …${item.id.slice(-4)}`, item.kind === 'server' ? 'Still joined' : item.kind === 'friend' ? 'Still friends' : 'Conversation preserved');
      const actions = element('div', 'row-actions');
      if (item.kind !== 'friend') actions.append(button('Open once', () => {
        void invoke('open_hidden', { id: item.id, kind: item.kind }).then(() => navigation.page('chat')).catch(error => toast(String(error)));
      }, 'button text-button'));
      actions.append(button('Restore', () => {
        void invoke('restore_hidden', { id: item.id, kind: item.kind }).then(() => navigation.page('hidden')).catch(error => toast(String(error)));
      }, 'button secondary'));
      node.append(actions); list.append(node);
    }
    root.append(list);
  }
  root.append(callout('Hidden stays hidden', 'New messages do not restore a conversation. Open it once or choose Restore when you want it back. Some Discord layouts may not expose a stable item identifier.'));
  return root;
}
