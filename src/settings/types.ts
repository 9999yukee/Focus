export type HiddenKind = 'server' | 'conversation' | 'friend';
export interface HiddenItem { id: string; label: string; kind: HiddenKind }
export interface Settings {
  version: number;
  theme: 'black' | 'gray' | 'white';
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
  closeToTray: boolean;
  desktopNotifications: boolean;
  hiddenServers: HiddenItem[];
  hiddenFriends: HiddenItem[];
}
export const defaults: Settings = {
  version: 1, theme: 'black', density: 'compact', reduceMotion: true,
  showAvatars: true, animatedAvatars: false, animatedEmoji: false,
  showEmbeds: true, showStickers: true, pauseOffscreenMedia: true,
  autoplayVideo: false, backgroundMode: 'minimum', hidePromotions: true,
  closeToTray: false, desktopNotifications: false, hiddenServers: [], hiddenFriends: [],
};
export interface ResourcePolicy {
  state: 'FOCUSED' | 'UNFOCUSED' | 'MINIMIZED';
  pauseCosmetics: boolean;
  pauseAttachmentVideo: boolean;
  preserveRealtime: boolean;
  viewVisible: boolean;
}
