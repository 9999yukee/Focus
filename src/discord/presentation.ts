import type { Settings } from '../settings/types';
import { hiddenSelector, promotionSelectors } from './selectors';

export function presentationCss(settings: Settings): string {
  const light = settings.theme === 'white';
  const background = light ? '#ffffff' : settings.theme === 'gray' ? '#1c1c1c' : '#000000';
  const panel = light ? '#f0f0f0' : '#1c1c1c';
  const text = light ? '#000000' : '#ffffff';
  const muted = light ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.6)';
  const hover = light ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.06)';
  const selectors = [...settings.hiddenServers, ...settings.hiddenFriends].map(hiddenSelector);
  return `
    html { background: ${background} !important; color-scheme: ${light ? 'light' : 'dark'} !important; }
    body { filter: grayscale(1) !important; background: ${background} !important; }
    :root, .theme-dark, .theme-light, [class*="theme-dark"], [class*="theme-light"] {
      --background-primary: ${background} !important; --background-secondary: ${background} !important;
      --background-secondary-alt: ${panel} !important; --background-tertiary: ${background} !important;
      --background-floating: ${panel} !important; --background-base-lowest: ${background} !important;
      --background-base-lower: ${background} !important; --background-base-low: ${background} !important;
      --background-surface-high: ${panel} !important; --background-surface-higher: ${panel} !important;
      --background-surface-highest: ${panel} !important; --background-mod-subtle: ${hover} !important;
      --background-modifier-hover: ${hover} !important; --background-modifier-selected: ${hover} !important;
      --text-normal: ${text} !important; --text-primary: ${text} !important; --header-primary: ${text} !important;
      --text-muted: ${muted} !important; --text-secondary: ${muted} !important; --header-secondary: ${muted} !important;
      --interactive-normal: ${muted} !important; --interactive-hover: ${text} !important; --interactive-active: ${text} !important;
      --channels-default: ${muted} !important; --channeltextarea-background: ${panel} !important;
      --brand-experiment: ${text} !important; --brand-500: #808080 !important; --text-link: ${text} !important;
      --font-primary: 'Segoe UI Variable', 'Segoe UI', sans-serif !important;
      --font-display: 'Segoe UI Variable', 'Segoe UI', sans-serif !important;
    }
    [class*="chatContent"] { background: ${background} !important; }
    [class*="messageListItem"] { --message-spacing: ${settings.density === 'compact' ? '8px' : '16px'}; }
    [class*="messageListItem"] [class*="groupStart"] { margin-top: var(--message-spacing) !important; }
    ${settings.hidePromotions ? `${promotionSelectors.join(',')} { display:none !important; }` : ''}
    ${selectors.length ? `${selectors.join(',')} { display:none !important; }` : ''}
    ${settings.reduceMotion ? '*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' : ''}
    html[data-focus-background] *, html[data-focus-background] *::before, html[data-focus-background] *::after { animation-play-state: paused !important; transition: none !important; }
    ${!settings.showAvatars ? '[id^="chat-messages-"] [class*="avatar"] { visibility:hidden !important; }' : ''}
    ${!settings.showEmbeds ? '[id^="chat-messages-"] [class*="embedFull"] { display:none !important; }' : ''}
    ${!settings.showStickers ? '[id^="chat-messages-"] [class*="stickerAsset"] { display:none !important; }' : ''}
    .focus-hide-action { all: initial; box-sizing: border-box; display:block; width:100%; padding:10px 12px; background:${panel}; color:${text}; font:13px 'Segoe UI',sans-serif; cursor:pointer; border-top:1px solid ${hover}; }
    .focus-hide-action:hover, .focus-hide-action:focus-visible { background:${text}; color:${background}; outline:0; }
    #focus-context { position:fixed; z-index:2147483647; width:220px; border:1px solid ${muted}; border-radius:6px; overflow:hidden; background:${panel}; }
    @media (max-width: 980px) { [class*="membersWrap"] { display:none !important; } }
  `;
}
