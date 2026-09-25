import { invoke, isTauri } from '@tauri-apps/api/core';
import type { Settings } from '../settings/types';
import { defaults } from '../settings/types';
import { toast } from '../components/dom';

export const native = isTauri();
let current = structuredClone(defaults);
let saving = Promise.resolve();
const subscribers = new Set<(settings: Settings) => void>();
export const settingsStore = {
  get: (): Settings => current,
  async load(): Promise<void> { if (native) current = await invoke<Settings>('load_settings'); applyTheme(); },
  receive(settings: Settings): void { current = settings; applyTheme(); for (const subscriber of subscribers) subscriber(settings); },
  subscribe(listener: (settings: Settings) => void): () => void { subscribers.add(listener); return () => subscribers.delete(listener); },
  async update<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    saving = saving.then(async () => {
      const next = { ...current, [key]: value };
      try {
        if (native) await invoke('save_settings', { settings: next });
        current = { ...next, hiddenServers: current.hiddenServers, hiddenFriends: current.hiddenFriends };
        applyTheme(); for (const subscriber of subscribers) subscriber(current);
      } catch (error) { toast(String(error)); throw error; }
    }).catch(() => {});
    return saving;
  },
};
function applyTheme(): void { document.documentElement.dataset.theme = current.theme; document.documentElement.dataset.density = current.density; }
