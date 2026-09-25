import { expect, it } from 'vitest';
import { defaults } from '../src/settings/types';
import { presentationCss } from '../src/discord/presentation';
import { hiddenSelector } from '../src/discord/selectors';
import { readFileSync } from 'node:fs';

it('hides positive marketing selectors without disabling useful boosted-server features', () => {
  const css = presentationCss(defaults);
  expect(css).toContain('a[href="/shop"]');
  expect(css).toContain('a[href="/discovery"]');
  expect(css).not.toContain('bitrate'); expect(css).not.toContain('WebRTC');
  expect(presentationCss({ ...defaults, hidePromotions: false })).not.toContain('a[href="/shop"]');
});
it('validates IDs before making selectors', () => {
  expect(hiddenSelector({ id: '12345678901234567', kind: 'server', label: '' })).toContain('guildsnav___12345678901234567');
  expect(hiddenSelector({ id: '"] *', kind: 'conversation', label: '' })).toBe(':not(*)');
});
it('gives the remote webview only four bounded presentation commands', () => {
  const capability = JSON.parse(readFileSync('src-tauri/capabilities/discord.json', 'utf8'));
  expect(capability.local).toBe(false);
  expect(capability.webviews).toEqual(['discord']);
  expect(capability.windows).toBeUndefined();
  expect(capability.remote.urls).toEqual(['https://discord.com/*']);
  expect(capability.permissions).toEqual(['allow-bridge-ready', 'allow-bridge-hide', 'allow-bridge-metrics', 'allow-bridge-unread']);
  const shell = JSON.parse(readFileSync('src-tauri/capabilities/shell.json', 'utf8'));
  expect(shell.webviews).toEqual(['shell']); expect(shell.windows).toBeUndefined();
});
