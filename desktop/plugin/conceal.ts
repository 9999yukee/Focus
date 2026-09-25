// SPDX-License-Identifier: GPL-3.0-or-later
import { FocusPreferences, HiddenItem, isCommercialKey, validItem } from './model';

const itemMarker = 'data-focus-concealed';
const navPromo = [
    'a[href="/store"]', 'a[href="/shop"]', 'a[href="/quests"]', 'a[href="/quest-home"]',
    'a[href="/discovery"]', 'a[href^="/discovery/"]', 'a[href="/guild-discovery"]',
    '[data-list-item-id^="private-channels-"][data-list-item-id$="___nitro"]',
    '[data-list-item-id^="private-channels-"][data-list-item-id$="___shop"]',
    '[data-list-item-id^="private-channels-"][data-list-item-id$="___quests"]',
    '[data-list-item-id="guildsnav___guild-discover-button"]',
    '[data-list-item-id="guildsnav___guild-discovery-button"]'
].join(',');
const promo = [
    '[data-testid="quest-bar-container"]',
    '[class*="questBar"]', '[class*="questsEntryPoint"]', '[class*="questPromo"]',
    '[class*="questToast"]', '[class*="questTile"]', '[class*="questBanner"]',
    '[class*="premiumPromo"]', '[class*="premiumUpsell"]', '[class*="upsellContainer"]',
    '[class*="premiumTab"]', '[class*="premiumMarketing"]', '[class*="boostsRequired"]',
    '[class*="guildBoosting"][class*="banner"]',
    '[aria-label="Send a gift"]', '[aria-label="Envoyer un cadeau"]', '[aria-label="Gift Nitro"]'
].join(',');
const closeNames = /^(?:close|dismiss|fermer|ignorer)(?:\s|$)/i;
const questNames = /^(?:discord\s+)?(?:quests?|quêtes?)(?:\s|$)/i;
export function selectorFor(item: HiddenItem): string {
    if (!validItem(item)) return ':not(*)';
    if (item.kind === 'server') return `[data-list-item-id="guildsnav___${item.id}"]`;
    if (item.kind === 'friend') return `[data-list-item-id="people-list___${item.id}"]`;
    return `a[href="/channels/@me/${item.id}"]`;
}

/** Find the complete navigation row, including icon, unread pill and tooltip trigger.
 * Never climb across another item, a list, or a folder containing multiple guilds. */
export function rowFor(element: Element): Element {
    const boundary = element.closest('nav,[role="tree"],[role="list"],[role="tablist"],[class*="privateChannels"],[class*="peopleList"]');
    let row = element;
    for (let depth = 0, parent = element.parentElement; parent && depth < 7; parent = parent.parentElement, depth++) {
        if (parent === boundary || parent.matches('body,main,nav,ul,ol,[role="group"],[role="tree"],[role="list"],[role="tablist"]')) break;
        const peers = parent.querySelectorAll('[data-list-item-id^="guildsnav___"],a[href^="/channels/@me/"],[data-list-item-id^="people-list___"],a[href="/shop"],a[href="/store"],a[href="/quest-home"]');
        if (peers.length > 1) break;
        if (parent.matches('li,[role="listitem"],[role="treeitem"],[class*="listItem_"],[class*="listItemWrapper_"],[class*="listItem__"],[class*="channel_"],[class*="channel__"],[class*="peopleListItem"]')) row = parent;
    }
    return row;
}
function questDialog(dialog: Element): boolean {
    if (dialog.matches('[data-quest-id],[class*="quest" i]')) return true;
    if (dialog.querySelector('[data-quest-id],[class*="questModal"],[class*="questReward"],[class*="questContent"],[class*="questHeader"]')) return true;
    const label = dialog.getAttribute('aria-label') ?? '';
    const titleId = dialog.getAttribute('aria-labelledby');
    const title = titleId ? document.getElementById(titleId)?.textContent ?? '' : '';
    return questNames.test(label) || questNames.test(title);
}

/** Reconciles a bounded set of changed subtrees; no continuous document scan. */
export class Concealment {
    private marked = new Set<Element>();
    private dialogs = new WeakSet<Element>();
    private roots = new Set<ParentNode>();
    private scheduled = 0;
    private observer: MutationObserver;
    private preferences: FocusPreferences;
    constructor(preferences: FocusPreferences) {
        this.preferences = preferences;
        this.observer = new MutationObserver(records => {
            for (const record of records) {
                const target = record.target as Element;
                if (target.closest?.('[id^="chat-messages-"]')) continue;
                if (record.type === 'attributes') {
                    // Speaking indicators and message animation classes need no navigation scan.
                    if (record.attributeName === 'class' && !target.matches(promo)
                        && !target.closest(`nav,[role="tree"],[role="tablist"],[role="dialog"],[${itemMarker}],[class*="peopleList"]`)) continue;
                    this.queue(rowFor(target).parentElement ?? target);
                }
                for (const node of record.addedNodes) if (node instanceof Element && !node.closest('[id^="chat-messages-"]')) this.queue(node);
            }
        });
        this.observer.observe(document.body, { subtree: true, childList: true, attributes: true,
            attributeFilter: ['data-list-item-id', 'href', 'class', 'aria-label', 'aria-labelledby', 'data-tab-id'] });
        this.scan(document.body);
    }
    configure(preferences: FocusPreferences): void {
        this.preferences = preferences;
        for (const element of this.marked) element.removeAttribute(itemMarker);
        this.marked.clear();
        this.scan(document.body);
    }
    private queue(root: ParentNode): void {
        for (const pending of this.roots) if ((pending as Node).contains(root as Node)) return;
        for (const pending of this.roots) if ((root as Node).contains(pending as Node)) this.roots.delete(pending);
        if (this.roots.size >= 50) { this.roots.clear(); this.roots.add(document.body); }
        else if (!this.roots.has(document.body)) this.roots.add(root);
        if (!this.scheduled) this.scheduled = window.setTimeout(() => {
            this.scheduled = 0;
            for (const element of this.marked) if (!element.isConnected) this.marked.delete(element);
            for (const node of this.roots) if ((node as Node).isConnected) this.scan(node);
            this.roots.clear();
        }, document.hidden ? 500 : 30);
    }
    private mark(element: Element): void {
        element.setAttribute(itemMarker, ''); this.marked.add(element);
    }
    scan(root: ParentNode): void {
        // Clear only this subtree, including recycled rows whose identity changed.
        for (const node of [...this.marked]) if (node === root || (root as Node).contains(node)) {
            node.removeAttribute(itemMarker); this.marked.delete(node);
        }
        const select = (selector: string): Element[] => [
            ...(root instanceof Element && root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)
        ];
        for (const item of this.preferences.hidden) for (const match of select(selectorFor(item))) this.mark(rowFor(match));
        if (!this.preferences.hidePromotions) return;
        for (const match of select(navPromo)) {
            // Never hide a user's message containing a link to the shop.
            if (match.closest('nav,[role="tree"],[class*="privateChannels"]')) this.mark(rowFor(match));
        }
        for (const match of select(promo)) if (!match.closest('[id^="chat-messages-"]')) this.mark(match);
        for (const tab of select('[role="tab"], [data-tab-id], [data-list-item-id^="settings-"]')) {
            const key = tab.getAttribute('data-tab-id') || tab.getAttribute('data-list-item-id') || tab.getAttribute('aria-controls') || '';
            if (isCommercialKey(key)) this.mark(tab);
        }
        for (const dialog of select('[role="dialog"],[role="alertdialog"]')) {
            if (!questDialog(dialog) || this.dialogs.has(dialog)) continue;
            const close = [...dialog.querySelectorAll<HTMLElement>('button,[role="button"]')].find(button =>
                closeNames.test(button.getAttribute('aria-label') ?? '') || closeNames.test(button.textContent?.trim() ?? '')
            );
            // Close via the existing control so Discord also releases the focus trap and backdrop.
            // An unrecognised dialog remains usable instead of becoming an invisible click trap.
            if (close) { this.dialogs.add(dialog); close.click(); }
        }
    }
    dispose(): void {
        this.observer.disconnect(); window.clearTimeout(this.scheduled); this.roots.clear();
        for (const element of this.marked) element.removeAttribute(itemMarker);
        this.marked.clear();
    }
}
