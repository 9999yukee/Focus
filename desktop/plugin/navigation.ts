// SPDX-License-Identifier: GPL-3.0-or-later
export interface GuildNode { type?: string; id?: string; children?: GuildNode[]; [key: string]: unknown }

/** Filter the view model, never the membership store. Folder previews use this same tree. */
export function visibleGuildNode(node: GuildNode, hidden: ReadonlySet<string>): GuildNode | null {
    if (node.type === 'guild') return node.id && hidden.has(node.id) ? null : node;
    if (node.type !== 'folder' || !node.children) return node;
    const children = node.children.map(child => visibleGuildNode(child, hidden)).filter((child): child is GuildNode => child !== null);
    if (!children.length) return null;
    return children.length === node.children.length && children.every((child, i) => child === node.children![i])
        ? node : { ...node, children };
}

export function profileSections<T extends { section: string }>(items: T[], inlineActivityReady: boolean): T[] {
    return items.filter(item => !['WIDGETS', 'WISHLIST'].includes(item.section)
        && (item.section !== 'ACTIVITY' || !inlineActivityReady));
}

export type UnreadItem = string | { folderId?: string | null; guildIds: string[]; [key: string]: unknown };
/** The native scroll indicator must use the same visible IDs as the navigation. */
export function visibleUnreadItems(items: UnreadItem[], hidden: ReadonlySet<string>, hidePromotions: boolean): UnreadItem[] {
    return items.flatMap<UnreadItem>(item => {
        if (typeof item === 'string') return hidden.has(item)
            || (hidePromotions && /^(?:e3_)?server_discovery_badge_/.test(item)) ? [] : [item];
        const guildIds = item.guildIds.filter(id => !hidden.has(id));
        return guildIds.length ? [{ ...item, guildIds }] : [];
    });
}
