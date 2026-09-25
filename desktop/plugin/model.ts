// SPDX-License-Identifier: GPL-3.0-or-later
export type HiddenKind = 'server' | 'conversation' | 'friend';
export type FocusTheme = 'discord' | 'black' | 'gray' | 'white';
export interface HiddenItem { id: string; kind: HiddenKind; label: string }
export interface FocusPreferences {
    theme: FocusTheme;
    density: 'compact' | 'comfortable';
    reduceMotion: boolean;
    showAvatars: boolean;
    animatedAvatars: boolean;
    animatedEmoji: boolean;
    showEmbeds: boolean;
    showStickers: boolean;
    pauseOffscreenMedia: boolean;
    autoplayVideo: boolean;
    backgroundMode: 'minimum' | 'balanced';
    hidePromotions: boolean;
    compactSettings: boolean;
    hidden: HiddenItem[];
}
export const defaults: FocusPreferences = {
    theme: 'discord', density: 'compact', reduceMotion: true, showAvatars: true,
    animatedAvatars: false, animatedEmoji: false, showEmbeds: true, showStickers: true,
    pauseOffscreenMedia: true, autoplayVideo: false, backgroundMode: 'minimum',
    hidePromotions: true, compactSettings: false, hidden: []
};
export function validItem(item: HiddenItem): boolean {
    return /^\d{17,20}$/.test(item.id) && ['server', 'conversation', 'friend'].includes(item.kind);
}
export function normalize(input: Partial<FocusPreferences> | undefined): FocusPreferences {
    const result = { ...defaults, hidden: [] as HiddenItem[] };
    if (!input || typeof input !== 'object') return result;
    for (const key of Object.keys(defaults) as (keyof FocusPreferences)[]) {
        if (typeof defaults[key] === 'boolean' && typeof input[key] === 'boolean')
            (result as unknown as Record<string, unknown>)[key] = input[key];
    }
    if (['discord', 'black', 'gray', 'white'].includes(input.theme!)) result.theme = input.theme! as FocusTheme;
    if (['compact', 'comfortable'].includes(input.density!)) result.density = input.density!;
    if (['minimum', 'balanced'].includes(input.backgroundMode!)) result.backgroundMode = input.backgroundMode!;
    const seen = new Set<string>();
    for (const item of Array.isArray(input.hidden) ? input.hidden : []) {
        if (!item || !validItem(item) || seen.has(`${item.kind}:${item.id}`)) continue;
        seen.add(`${item.kind}:${item.id}`);
        const label = Array.from(String(item.label ?? '')).filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).slice(0, 80).join('');
        result.hidden.push({ id: item.id, kind: item.kind, label });
    }
    return result;
}

// Match product identifiers, never message text, usernames or generic words like "boost".
export function isCommercialKey(value: string): boolean {
    const key = value.replace(/[\s-]+/g, '_').toLowerCase();
    // Keep billing/subscriptions: managing and cancelling existing purchases must remain available.
    return /(?:^|_)(?:nitro|premium|quests?|shop|store|merch|hypesquad|guild_boosting|server_boost|guild_discovery)(?:_|$)/.test(key)
        && !/(?:subscription|billing|payment|data_usage|sponsored_content|privacy|consent)/.test(key);
}
export const categories = [
    ['account', 'Compte'], ['audio', 'Audio et vidéo'], ['notifications', 'Notifications'],
    ['privacy', 'Confidentialité'], ['appearance', 'Apparence'], ['performance', 'Performances']
] as const;
export type Category = typeof categories[number][0];
export function categoryFor(key: string): Category {
    if (/voice|audio|video|soundboard/i.test(key)) return 'audio';
    if (/notification/i.test(key)) return 'notifications';
    if (/privacy|safety|data_and|content_social|family|blocked|activity_privacy|messaging_permissions/i.test(key)) return 'privacy';
    if (/appearance|accessibility|chat_|text_|language/i.test(key)) return 'appearance';
    if (/advanced|keybind|overlay|game_activity|registered_games|system|clips/i.test(key)) return 'performance';
    return 'account';
}
