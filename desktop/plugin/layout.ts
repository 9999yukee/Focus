// SPDX-License-Identifier: GPL-3.0-or-later
import { categories, Category, categoryFor } from './model';
import { removeSetting } from './settingsPolicy';

export interface LayoutNode {
    key?: string;
    type: number;
    buildLayout?(): LayoutNode[];
    useTitle?(): string;
    [key: string]: unknown;
}
/** Keep native forms and their panel IDs. Only change the local navigation tree. */
export function focusLayout(root: LayoutNode[], compact: boolean, hidePromotions: boolean,
    entries: { appearance: LayoutNode; performance: LayoutNode; profile?: LayoutNode }): LayoutNode[] {
    const prune = (nodes: LayoutNode[]): LayoutNode[] => nodes
        .filter(node => !removeSetting(node.key ?? '', compact, hidePromotions))
        .map(node => node.buildLayout ? { ...node, buildLayout: () => prune(node.buildLayout!()) } : node);
    if (!compact) return [...prune(root), { key: 'focus_section', type: 1, useTitle: () => 'Focus', buildLayout: () => Object.values(entries) }];
    const buckets = Object.fromEntries(categories.map(([id]) => [id, []])) as unknown as Record<Category, LayoutNode[]>;
    buckets.appearance.push(entries.appearance);
    buckets.performance.push(entries.performance);
    if (entries.profile) buckets.account.push(entries.profile);
    const utilities: LayoutNode[] = [];
    for (const section of prune(root)) {
        if (section.key === 'vencord_section') continue;
        if (section.key === 'utility_section') { utilities.push(section); continue; }
        const items = section.type === 1 && section.buildLayout ? section.buildLayout() : [section];
        for (const item of items) {
            if (item.type === 2 && item.buildLayout) buckets[categoryFor(item.key ?? '')].push(item);
            else utilities.push(item);
        }
    }
    const items = categories.map(([id, title]) => ({
        ...entries.appearance,
        key: `focus_${id}`, useTitle: () => title,
        buildLayout: () => buckets[id].flatMap(item => item.buildLayout?.() ?? [])
    }));
    return [{ key: 'focus_section', type: 1, useTitle: () => 'Focus', buildLayout: () => items }, ...utilities];
}
