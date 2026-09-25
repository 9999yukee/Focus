import { element, button } from './dom';
import { icon } from './icons';
import { settingsStore } from '../stores/settings';
import type { Settings } from '../settings/types';

export function group(title: string, description?: string): HTMLElement {
  const section = element('section', 'setting-group');
  const head = element('div', 'group-heading'); head.append(element('h2', '', title));
  if (description) head.append(element('p', '', description)); section.append(head); return section;
}

export function row(title: string, description: string): HTMLElement {
  const node = element('div', 'setting-row'); const copy = element('div', 'setting-copy');
  copy.append(element('h3', '', title), element('p', '', description)); node.append(copy); return node;
}
type BooleanKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
export function toggle(key: BooleanKey, title: string, description: string): HTMLElement {
  const node = row(title, description);
  const control = button('', () => {
    control.disabled = true;
    void settingsStore.update(key, !settingsStore.get()[key]).then(() => {
      control.setAttribute('aria-checked', String(settingsStore.get()[key])); control.disabled = false;
    });
  }, 'toggle');
  control.role = 'switch'; control.setAttribute('aria-label', title); control.setAttribute('aria-checked', String(settingsStore.get()[key]));
  control.innerHTML = '<span></span>'; node.append(control); return node;
}
export function selectSetting<K extends 'density' | 'backgroundMode'>(key: K, title: string, description: string, choices: { value: Settings[K]; label: string }[]): HTMLElement {
  const node = row(title, description); const control = element('select'); control.setAttribute('aria-label', title);
  for (const choice of choices) { const option = element('option', '', choice.label); option.value = choice.value; control.append(option); }
  control.value = settingsStore.get()[key];
  control.addEventListener('change', () => { void settingsStore.update(key, control.value as Settings[K]).then(() => { control.value = settingsStore.get()[key]; }); });
  node.append(control); return node;
}
export function fact(title: string, description: string, status: string): HTMLElement {
  const node = row(title, description); node.append(element('span', 'status-label', status)); return node;
}
export function callout(title: string, description: string, action?: { label: string; run: () => void }): HTMLElement {
  const node = element('div', 'callout'); const symbol = element('div', 'callout-icon'); symbol.innerHTML = icon('info');
  const copy = element('div'); copy.append(element('h3', '', title), element('p', '', description)); node.append(symbol, copy);
  if (action) node.append(button(action.label, action.run, 'button text-button'));
  return node;
}
