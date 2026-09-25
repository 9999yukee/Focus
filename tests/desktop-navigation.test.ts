import { describe, expect, it } from 'vitest';
import { profileSections, visibleGuildNode, visibleUnreadItems, type UnreadItem } from '../desktop/plugin/navigation';
import { assessSetting, removeSetting } from '../desktop/plugin/settingsPolicy';
import { focusLayout } from '../desktop/plugin/layout';

describe('Focus native navigation', () => {
    it('does not signal hidden servers or DMs in the NEW scroll indicator, including collapsed folders', () => {
        const items: UnreadItem[] = ['null', 'hidden-dm', 'visible-dm',
            { folderId: 'mixed', guildIds: ['hidden-server', 'visible-server'] },
            { folderId: 'empty', guildIds: ['hidden-server'] }, 'e3_server_discovery_badge_19_06_08', 'add-server-item'];
        expect(visibleUnreadItems(items, new Set(['hidden-dm', 'hidden-server']), true)).toEqual([
            'null', 'visible-dm', { folderId: 'mixed', guildIds: ['visible-server'] }, 'add-server-item'
        ]);
        expect((items[3] as { guildIds: string[] }).guildIds).toEqual(['hidden-server', 'visible-server']);
        expect(visibleUnreadItems(items, new Set(), false)).toEqual(items);
    });
    it('removes folder previews, hidden rows and empty folders without mutating membership data', () => {
        const hidden = { type: 'guild', id: '1' }, visible = { type: 'guild', id: '2' };
        const folder = { type: 'folder', id: 'folder', children: [hidden, visible] };
        const result = visibleGuildNode(folder, new Set(['1']));
        expect(result?.children).toEqual([visible]);
        expect(result?.children?.[0]).toBe(visible);
        expect(folder.children).toEqual([hidden, visible]);
        expect(visibleGuildNode(folder, new Set(['1', '2']))).toBeNull();
        expect(visibleGuildNode(folder, new Set())).toBe(folder);
        expect(visibleGuildNode({ type: 'unknown', id: '1' }, new Set(['1']))).toEqual({ type: 'unknown', id: '1' });
    });
    it('keeps mutual links and bot access, and preserves activity access if the inline patch is unavailable', () => {
        const tabs = ['WIDGETS', 'ACTIVITY', 'WISHLIST', 'MUTUAL_FRIENDS', 'MUTUAL_GUILDS', 'BOT_DATA_ACCESS'].map(section => ({ section }));
        expect(profileSections(tabs, true).map(tab => tab.section)).toEqual(['MUTUAL_FRIENDS', 'MUTUAL_GUILDS', 'BOT_DATA_ACCESS']);
        expect(profileSections(tabs, false).map(tab => tab.section)).toContain('ACTIVITY');
        expect(profileSections(tabs.slice(0, 3), true)).toEqual([]);
    });
    it('preserves consent and paid subscription management even when their IDs contain quests or premium', () => {
        for (const key of ['data_usage_quests_setting', 'sponsored_content_quests_3p_setting', 'premium_guild_subscriptions_panel',
            'subscriptions_settings', 'billing_payment_methods', 'account_delete_setting', 'authorized_apps_list_setting']) {
            expect(assessSetting(key).decision).toBe('keep');
            expect(removeSetting(key, true, true)).toBe(false);
        }
    });
    it('keeps the controls that can actually turn off costly features and leaves unknown settings intact', () => {
        for (const key of ['clips_enable', 'clips_enable_autoclipping', 'hardware_acceleration', 'overlay_oop_setting', 'voice_noise_suppression_setting'])
            expect(assessSetting(key).decision).toBe('performance');
        expect(assessSetting('future_native_option').decision).toBe('keep');
    });
    it('prunes promotional leaves inside native categories while keeping consent controls and original IDs', () => {
        const native = { key: 'appearance_sidebar_item', type: 2, buildLayout: () => [{ key: 'appearance_panel', type: 3,
            buildLayout: () => ['appearance_custom_themes_upsell', 'sponsored_content_quests_setting', 'appearance_font_scaling'].map(key => ({ key, type: 19 })) }] };
        const root = [{ key: 'app_section', type: 1, buildLayout: () => [native] }];
        const result = focusLayout(root, false, true, { appearance: native, performance: native });
        const leaves = result[0].buildLayout!()[0].buildLayout!()[0].buildLayout!();
        expect(leaves.map(leaf => leaf.key)).toEqual(['sponsored_content_quests_setting', 'appearance_font_scaling']);
        expect(native.buildLayout()[0].buildLayout()).toHaveLength(3);
    });
});
