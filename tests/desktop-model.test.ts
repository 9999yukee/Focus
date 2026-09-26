import { describe, it, expect } from 'vitest';
import { normalize, isCommercialKey } from '../desktop/plugin/model';
import { focusLayout, type LayoutNode } from '../desktop/plugin/layout';

const item = (key: string): LayoutNode => ({ key, type: 2, buildLayout: () => [{ key: `${key}_panel`, type: 3 }] });
const section = (key: string, children: LayoutNode[]): LayoutNode => ({ key, type: 1, buildLayout: () => children });
const extra = { appearance: item('focus_appearance'), performance: item('focus_performance') };
describe('Focus desktop preferences and native settings layout', () => {
    it('keeps the native Discord settings layout enabled by default', () => {
        expect(normalize(undefined).compactSettings).toBe(false);
        expect(normalize(undefined).theme).toBe('discord');
        expect(normalize({ theme: 'black', compactSettings: true }).compactSettings).toBe(false);
        expect(normalize({ theme: 'black', compactSettings: true }).theme).toBe('discord');
    });
    it('rejects invalid identities and unsafe selector content, deduplicates by kind', () => {
        const value = normalize({ hidden: [
            { id: '12345678901234567', kind: 'server', label: 'Example\u0000' },
            { id: '12345678901234567', kind: 'server', label: 'Again' },
            { id: '12345678901234567', kind: 'friend', label: 'Friend' },
            { id: '"] body', kind: 'server', label: 'Invalid' }
        ] });
        expect(value.hidden).toHaveLength(2);
        expect(value.hidden[0].label).toBe('Example');
        expect(normalize({ theme: 'purple' as 'black' }).theme).toBe('discord');
    });
    it('preserves billing, subscription cancellation, security and capabilities', () => {
        for (const key of ['billing', 'premium_subscriptions', 'payments', 'voice_video', 'privacy_and_safety', 'authorized_apps'])
            expect(isCommercialKey(key)).toBe(false);
        for (const key of ['nitro', 'premium', 'guild_boosting', 'quests', 'shop', 'guild_discovery', 'nitro_server_boost'])
            expect(isCommercialKey(key)).toBe(true);
    });
    it('groups native panels into six entries and removes commercial nodes before rendering', () => {
        const original = [section('user_section', [item('account'), item('voice_video'), item('notifications'), item('privacy_and_safety'), item('appearance'), item('advanced')]),
            section('billing_section', [item('nitro'), item('guild_boosting'), item('billing'), item('premium_subscriptions')]),
            section('utility_section', [item('logout')])];
        const result = focusLayout(original, true, true, extra);
        const tabs = result[0].buildLayout!();
        expect(tabs).toHaveLength(6);
        const panels = tabs.flatMap(tab => tab.buildLayout!()).map(panel => panel.key);
        expect(panels).not.toContain('nitro_panel');
        expect(panels).not.toContain('guild_boosting_panel');
        expect(panels).toContain('voice_video_panel');
        expect(panels).toContain('premium_subscriptions_panel');
        expect(panels).toContain('billing_panel');
        expect(result[1].key).toBe('utility_section');
        expect(original[1].buildLayout!()).toHaveLength(4);
    });
    it('restores the complete layout when simplification and promotion filtering are disabled', () => {
        const original = [section('billing_section', [item('nitro'), item('shop')])];
        const result = focusLayout(original, false, false, extra);
        expect(result[0].buildLayout!().map(node => node.key)).toEqual(['nitro', 'shop']);
        expect(result[1].key).toBe('focus_section');
    });
    it('keeps the edit-profile entry in Account alongside the native account panels', () => {
        const result = focusLayout([section('user_section', [item('account')])], true, true,
            { ...extra, profile: item('focus_profile_options') });
        const account = result[0].buildLayout!().find(node => node.key === 'focus_account')!;
        expect(account.buildLayout!().map(node => node.key)).toEqual(['focus_profile_options_panel', 'account_panel']);
    });
});
