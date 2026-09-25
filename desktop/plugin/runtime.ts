// SPDX-License-Identifier: GPL-3.0-or-later
import { Concealment } from './conceal';
import { FocusPreferences } from './model';
import { themeCss } from './theme';
import { MediaResourceManager } from './shared/media/MediaResourceManager';
import { defaults as legacyDefaults } from './shared/settings/types';

export class FocusRuntime {
    private style = document.createElement('style');
    private concealment: Concealment;
    private media = new MediaResourceManager();
    private observer: MutationObserver;
    private pending = new Set<Element>();
    private images = new Map<HTMLImageElement, { src: string; srcset: string | null; replacement: string }>();
    private timer = 0;
    private originalTitle = document.title;
    private titleObserver: MutationObserver;
    constructor(private preferences: FocusPreferences) {
        this.titleObserver = new MutationObserver(() => { if (document.title !== 'Focus') document.title = 'Focus'; });
        const title = document.querySelector('title');
        if (title) this.titleObserver.observe(title, { childList: true, subtree: true, characterData: true });
        document.title = 'Focus';
        this.style.id = 'focus-desktop-theme'; document.head.append(this.style);
        this.concealment = new Concealment(preferences);
        this.observer = new MutationObserver(records => {
            for (const record of records) {
                if (record.type === 'attributes' && record.target instanceof HTMLImageElement) this.pending.add(record.target);
                for (const node of record.addedNodes) if (node instanceof Element) this.pending.add(node);
            }
            if (this.pending.size > 100) { this.pending.clear(); this.pending.add(document.body); }
            if (this.pending.size && !this.timer) this.timer = window.setTimeout(() => {
                this.timer = 0;
                for (const node of this.pending) if (node.isConnected) this.discover(node);
                this.pending.clear(); this.media.prune(); this.restoreImages();
            }, document.hidden ? 500 : 80);
        });
        this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
        document.addEventListener('visibilitychange', this.policy);
        window.addEventListener('blur', this.policy); window.addEventListener('focus', this.policy);
        this.configure(preferences);
    }
    configure(preferences: FocusPreferences): void {
        this.preferences = preferences; this.style.textContent = themeCss(preferences);
        this.concealment.configure(preferences);
        this.media.configure({ ...legacyDefaults, ...preferences,
            theme: preferences.theme === 'discord' ? 'black' : preferences.theme });
        this.restoreImages(); this.discover(document.body); this.policy();
    }
    private discover(root: Element): void {
        this.media.discover(root);
        const images = root instanceof HTMLImageElement ? [root] : root.querySelectorAll<HTMLImageElement>('img');
        for (const img of images) {
            const src = img.getAttribute('src');
            if (!src) continue;
            const avatar = /\/avatars\//.test(src), emoji = /\/emojis\//.test(src);
            if ((!avatar || this.preferences.animatedAvatars) && (!emoji || this.preferences.animatedEmoji)) continue;
            let url: URL;
            try { url = new URL(src, location.href); } catch { continue; }
            if (!['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname) || !url.pathname.endsWith('.gif')) continue;
            url.pathname = url.pathname.replace(/\.gif$/, '.png');
            this.images.set(img, { src, srcset: img.getAttribute('srcset'), replacement: url.href });
            img.removeAttribute('srcset'); img.src = url.href;
        }
    }
    private restoreImages(all = false): void {
        for (const [img, original] of this.images) {
            if (!img.isConnected || img.getAttribute('src') !== original.replacement) { this.images.delete(img); continue; }
            if (all || (/\/avatars\//.test(original.src) ? this.preferences.animatedAvatars : this.preferences.animatedEmoji)) {
                img.src = original.src;
                if (original.srcset) img.setAttribute('srcset', original.srcset);
                this.images.delete(img);
            }
        }
    }
    private policy = (): void => {
        const background = document.hidden || (this.preferences.backgroundMode === 'minimum' && !document.hasFocus());
        document.documentElement.toggleAttribute('data-focus-background', background);
        this.media.policy({ state: document.hidden ? 'MINIMIZED' : background ? 'UNFOCUSED' : 'FOCUSED',
            pauseAttachmentVideo: background, pauseCosmetics: background, preserveRealtime: true, viewVisible: !document.hidden });
    };
    dispose(): void {
        this.titleObserver.disconnect();
        if (document.title === 'Focus') document.title = this.originalTitle;
        this.observer.disconnect(); window.clearTimeout(this.timer); this.pending.clear();
        this.concealment.dispose(); this.media.dispose(); this.restoreImages(true); this.style.remove();
        document.removeEventListener('visibilitychange', this.policy);
        window.removeEventListener('blur', this.policy); window.removeEventListener('focus', this.policy);
        document.documentElement.removeAttribute('data-focus-background');
    }
}
