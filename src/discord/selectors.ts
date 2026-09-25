import type { HiddenItem } from '../settings/types';

export const promotionSelectors = [
  'a[href="/store"]', 'a[href="/shop"]', 'a[href="/quest-home"]', 'a[href="/quests"]',
  'a[href="/discovery"]', 'a[href^="/discovery/"]', 'a[href="/guild-discovery"]',
  '[data-list-item-id="private-channels-uid_0___nitro"]',
  '[data-list-item-id="private-channels-uid_0___shop"]',
  '[data-list-item-id="guildsnav___guild-discover-button"]',
  '[data-list-item-id="guildsnav___guild-discovery-button"]',
  '[aria-label="Send a gift"]', '[aria-label="Gift Nitro"]',
  '[class*="premiumTab"]', '[class*="questsEntryPoint"]', '[class*="questBar"]',
  '[class*="premiumPromo"]', '[class*="upsellContainer"]', '[class*="premiumUpsell"]',
  '[class*="channelNotice"][class*="boost"]', '[class*="container"][class*="premiumMarketing"]',
  '[class*="guildBoosting"][class*="banner"]', '[class*="boostsRequired"]',
];
const snowflake = /^\d{17,20}$/;
export function navigationItem(target: Element): HiddenItem | null {
  const guild = target.closest('[data-list-item-id^="guildsnav___"]');
  const guildId = guild?.getAttribute('data-list-item-id')?.split('___')[1];
  if (guild && guildId && snowflake.test(guildId)) return { id: guildId, kind: 'server', label: label(guild, 'Server', guildId) };
  const link = target.closest<HTMLAnchorElement>('a[href]');
  if (link && link.closest('nav, [class*="privateChannels"], [aria-label="Direct Messages"]')) {
    const match = /^\/channels\/@me\/(\d{17,20})$/.exec(link.getAttribute('href') ?? '');
    if (match) return { id: match[1], kind: 'conversation', label: label(link, 'Conversation', match[1]) };
  }
  // Stable list IDs are used when Discord supplies them; no React/private state inspection.
  const friend = target.closest('[data-list-item-id^="people-list___"]');
  const friendId = friend?.getAttribute('data-list-item-id')?.split('___')[1];
  if (friend && friendId && snowflake.test(friendId)) return { id: friendId, kind: 'friend', label: label(friend, 'Friend', friendId) };
  return null;
}
function label(element: Element, kind: string, id: string): string {
  const value = element.getAttribute('aria-label') || element.querySelector('img')?.getAttribute('alt') || `${kind} …${id.slice(-4)}`;
  return Array.from(value).filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).slice(0, 80).join('');
}
export function hiddenSelector(item: HiddenItem): string {
  if (!snowflake.test(item.id)) return ':not(*)';
  if (item.kind === 'server') return `[data-list-item-id="guildsnav___${item.id}"]`;
  if (item.kind === 'friend') return `[data-list-item-id="people-list___${item.id}"]`;
  return `a[href="/channels/@me/${item.id}"]`;
}
