import { defaults } from '../settings/types';
import type { Settings, ResourcePolicy, HiddenItem } from '../settings/types';
import { MediaResourceManager } from '../media/MediaResourceManager';
import { FrameSampler } from '../performance/FrameSampler';
import { hiddenSelector, navigationItem } from './selectors';
import { presentationCss } from './presentation';

interface Bridge {
  configure(settings: Settings): void;
  setPolicy(policy: ResourcePolicy): void;
  monitor(enabled: boolean): void;
  navigateHome(): void;
  openSettings(): void;
  openHidden(item: HiddenItem): void;
}
declare global {
  interface Window {
    __FOCUS__?: Bridge;
    __TAURI_INTERNALS__?: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> };
  }
}

// Never run in CAPTCHA/authentication subframes or outside the official origin.
if (window.top === window && location.origin === 'https://discord.com' && !window.__FOCUS__) {
  const invoke = async (command: string, args?: Record<string, unknown>): Promise<void> => {
    if (!window.__TAURI_INTERNALS__) return;
    await window.__TAURI_INTERNALS__.invoke(command, args);
  };
  let settings: Settings = structuredClone(defaults);
  let policy: ResourcePolicy = { state: 'FOCUSED', pauseCosmetics: false, pauseAttachmentVideo: false, preserveRealtime: true, viewVisible: true };
  const style = document.createElement('style'); style.id = 'focus-presentation';
  const media = new MediaResourceManager();
  const frames = new FrameSampler();
  const originalImages = new Map<HTMLImageElement, { src: string; srcset: string | null; staticSrc: string }>();
  let monitoring = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let scheduled = 0;
  let lastUnread = '';
  let contextItem: HiddenItem | null = null;
  const pending = new Set<ParentNode>();

  function staticImages(root: ParentNode): void {
    const images = root instanceof HTMLImageElement ? [root] : root.querySelectorAll<HTMLImageElement>('img[src*="cdn.discordapp.com"], img[src*="media.discordapp.net"]');
    for (const img of images) {
      const source = img.getAttribute('src');
      if (!source) continue;
      const avatar = /\/avatars\//.test(source), emoji = /\/emojis\//.test(source);
      if ((!avatar || settings.animatedAvatars) && (!emoji || settings.animatedEmoji)) continue;
      const url = new URL(source, location.href);
      if (!['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname) || !url.pathname.endsWith('.gif')) continue;
      url.pathname = url.pathname.replace(/\.gif$/, '.png');
      originalImages.set(img, { src: source, srcset: img.getAttribute('srcset'), staticSrc: url.toString() });
      img.removeAttribute('srcset'); img.src = url.toString();
    }
  }

  function restoreImages(): void {
    for (const [img, original] of originalImages) {
      if (!img.isConnected || img.getAttribute('src') !== original.staticSrc) { originalImages.delete(img); continue; }
      if (img.isConnected && (/\/avatars\//.test(original.src) ? settings.animatedAvatars : settings.animatedEmoji)) {
        img.src = original.src;
        if (original.srcset) img.setAttribute('srcset', original.srcset);
        originalImages.delete(img);
      }
    }
  }

  function hideAction(item: HiddenItem): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'focus-hide-action'; button.role = 'menuitem';
    button.textContent = `Hide ${item.kind === 'server' ? 'server' : item.kind === 'friend' ? 'friend' : 'conversation'} in Focus`;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      button.disabled = true;
      void invoke('bridge_hide', { item }).then(() => {
        document.getElementById('focus-context')?.remove();
        button.textContent = 'Hidden locally';
      }).catch(() => { button.textContent = 'Could not save. Try again.'; button.disabled = false; });
    });
    return button;
  }

  function extendMenu(): void {
    if (!contextItem) return;
    const menu = document.querySelector('[role="menu"]');
    if (menu && !menu.querySelector('.focus-hide-action')) menu.append(hideAction(contextItem));
  }

  function checkUnread(): void {
    const unread: string[] = [];
    for (const item of settings.hiddenFriends) {
      if (item.kind !== 'conversation') continue;
      const link = document.querySelector(hiddenSelector(item));
      if (link?.querySelector('[class*="numberBadge"], [class*="unread"]') || link?.className.includes('unread')) unread.push(item.id);
    }
    const key = unread.join(',');
    if (key !== lastUnread) { lastUnread = key; void invoke('bridge_unread', { ids: unread }).catch(() => {}); }
  }

  function flush(): void {
    scheduled = 0;
    for (const root of pending) {
      if (root instanceof Node && root.isConnected) { media.discover(root); staticImages(root); }
    }
    pending.clear(); media.prune(); restoreImages(); extendMenu(); checkUnread();
  }
  function queue(root?: ParentNode): void {
    if (root) {
      if (pending.size < 100) pending.add(root);
      else { pending.clear(); pending.add(document.body); }
    }
    if (!scheduled) scheduled = window.setTimeout(flush, policy.pauseCosmetics ? 1000 : 80);
  }

  function collect(): void {
    if (!monitoring) return;
    const frame = frames.take();
    const images = document.images;
    let loaded = 0;
    for (const img of images) if (img.complete && img.naturalWidth > 0) loaded++;
    const metrics = {
      ...frame,
      domNodes: document.getElementsByTagName('*').length,
      messagesRendered: document.querySelectorAll('[id^="chat-messages-"]').length,
      imagesLoaded: loaded,
      videoPlaying: Array.from(document.querySelectorAll('video')).filter(video => !video.paused).length,
      observedAtMs: Date.now(),
    };
    void invoke('bridge_metrics', { metrics }).catch(() => {});
  }

  function framePolicy(): void {
    if (monitoring && policy.viewVisible && policy.state === 'FOCUSED' && !document.hidden) frames.start();
    else frames.stop();
  }

  window.__FOCUS__ = {
    configure(value) {
      settings = value; style.textContent = presentationCss(settings);
      media.configure(settings); restoreImages(); queue(document.body);
    },
    setPolicy(value) {
      policy = value;
      document.documentElement.toggleAttribute('data-focus-background', value.pauseCosmetics);
      media.policy(value); framePolicy();
    },
    monitor(enabled) {
      monitoring = enabled;
      if (timer) { clearInterval(timer); timer = undefined; }
      framePolicy();
      if (enabled) { collect(); timer = setInterval(collect, 2000); }
    },
    navigateHome() {
      document.querySelector<HTMLAnchorElement>('a[href="/channels/@me"]')?.click();
    },
    openSettings() {
      const button = document.querySelector<HTMLElement>('[aria-label="User Settings"], [data-list-item-id="user-settings"]');
      if (button) button.click();
      else void invoke('bridge_ready', { status: 'settings-unavailable' }).catch(() => {});
    },
    openHidden(item) {
      const element = document.querySelector<HTMLElement>(hiddenSelector(item));
      if (element) element.click();
      else void invoke('bridge_ready', { status: 'hidden-unavailable' }).catch(() => {});
    },
  };

  function start(): void {
    document.head.append(style); style.textContent = presentationCss(settings);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.target === style || style.contains(record.target)) continue;
        for (const node of record.addedNodes) if (node instanceof Element && !node.classList.contains('focus-hide-action')) queue(node);
        if (record.type === 'attributes' && record.target instanceof HTMLImageElement) queue(record.target);
      }
      queue();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data-list-item-id', 'aria-label'] });
    document.addEventListener('contextmenu', event => {
      if (!(event.target instanceof Element)) return;
      contextItem = navigationItem(event.target);
      document.getElementById('focus-context')?.remove();
      if (!contextItem) return;
      if (event.shiftKey) {
        event.preventDefault(); event.stopPropagation();
        const menu = document.createElement('div'); menu.id = 'focus-context'; menu.role = 'menu';
        menu.style.left = `${Math.max(0, Math.min(event.clientX, innerWidth - 230))}px`;
        menu.style.top = `${Math.max(0, Math.min(event.clientY, innerHeight - 60))}px`;
        menu.append(hideAction(contextItem)); document.body.append(menu); menu.querySelector('button')?.focus();
      } else queue();
    }, true);
    document.addEventListener('pointerdown', event => {
      if (event.target instanceof Element && !event.target.closest('#focus-context')) document.getElementById('focus-context')?.remove();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') document.getElementById('focus-context')?.remove(); });
    document.addEventListener('visibilitychange', framePolicy);
    window.addEventListener('pagehide', () => { observer.disconnect(); media.dispose(); frames.stop(); if (timer) clearInterval(timer); clearTimeout(scheduled); pending.clear(); originalImages.clear(); }, { once: true });
    queue(document.body);
    void invoke('bridge_ready', { status: 'ready' }).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
}
