// SPDX-License-Identifier: GPL-3.0-or-later
import { FocusPreferences } from './model';

export function themeCss(settings: FocusPreferences): string {
  if (settings.theme === 'discord') return `
  [data-focus-concealed] { display:none!important; }
  ${settings.hidePromotions ? '[data-testid="quest-bar-container"], [class*="questToast"], [class*="questPromo"] { display:none!important; }' : ''}
  .focus-profile-activity { margin:16px 0; }
  .focus-profile-activity:empty { display:none; }
  ${settings.reduceMotion ? '*,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; }' : ''}
  html[data-focus-background] *,html[data-focus-background] *::before,html[data-focus-background] *::after { animation-play-state:paused!important; }
  ${!settings.showAvatars ? '[id^="chat-messages-"] [class*="avatar"]{visibility:hidden!important}' : ''}
  ${!settings.showEmbeds ? '[id^="chat-messages-"] [class*="embedFull"]{display:none!important}' : ''}
  ${!settings.showStickers ? '[id^="chat-messages-"] [class*="stickerAsset"]{display:none!important}' : ''}
  `;
    const light = settings.theme === 'white';
    const bg = light ? '#fff' : settings.theme === 'gray' ? '#1c1c1c' : '#000';
    const panel = light ? '#f2f2f2' : settings.theme === 'gray' ? '#252525' : '#111';
    const fg = light ? '#000' : '#fff';
    const muted = light ? '#595959' : '#a3a3a3';
    const hover = light ? '#e5e5e5' : '#303030';
    const border = light ? '#d6d6d6' : '#343434';
    return `
    :root, .theme-dark, .theme-light, .theme-darker, .theme-midnight {
      color-scheme:${light ? 'light' : 'dark'}!important;
      --focus-bg:${bg}; --focus-panel:${panel}; --focus-fg:${fg}; --focus-muted:${muted}; --focus-hover:${hover};
      --background-primary:${bg}!important; --background-secondary:${bg}!important;
      --background-secondary-alt:${panel}!important; --background-tertiary:${bg}!important;
      --background-floating:${panel}!important; --background-base-lowest:${bg}!important;
      --background-base-lower:${bg}!important; --background-base-low:${bg}!important;
      --background-surface-high:${panel}!important; --background-surface-higher:${panel}!important;
      --background-surface-highest:${panel}!important; --background-mod-subtle:${hover}!important;
      --background-mod-normal:${hover}!important; --background-mod-strong:${hover}!important;
      --background-modifier-hover:${hover}!important; --background-modifier-selected:${hover}!important;
      --text-normal:${fg}!important; --text-primary:${fg}!important; --header-primary:${fg}!important;
      --text-muted:${muted}!important; --text-secondary:${muted}!important; --header-secondary:${muted}!important;
      --interactive-normal:${muted}!important; --interactive-hover:${fg}!important; --interactive-active:${fg}!important;
      --text-default:${fg}!important; --text-strong:${fg}!important; --text-subtle:${muted}!important;
      --icon-default:${muted}!important; --icon-strong:${fg}!important; --icon-subtle:${muted}!important;
      --text-brand:${fg}!important; --icon-brand:${fg}!important; --background-brand:${fg}!important;
      --interactive-text-default:${fg}!important; --interactive-icon-default:${fg}!important;
      --border-subtle:${border}!important; --border-normal:${border}!important; --border-strong:${muted}!important;
      --border-muted:${border}!important; --border-focus:${fg}!important;
      --input-background-default:${panel}!important; --input-text-default:${fg}!important;
      --input-placeholder-text-default:${muted}!important; --input-border-default:${border}!important;
      --input-border-hover:${muted}!important; --input-border-active:${fg}!important;
      --scrollbar-thin-thumb:${hover}!important; --scrollbar-thin-track:transparent!important;
      --scrollbar-auto-thumb:${hover}!important; --scrollbar-auto-track:${bg}!important;
      --control-primary-background-default:${fg}!important; --control-primary-background-hover:${muted}!important;
      --control-primary-background-active:${muted}!important; --control-primary-border-default:${fg}!important;
      --control-primary-border-hover:${fg}!important; --control-primary-border-active:${fg}!important;
      --control-primary-text-default:${bg}!important; --control-primary-text-hover:${bg}!important; --control-primary-text-active:${bg}!important;
      --control-primary-icon-default:${bg}!important; --control-primary-icon-hover:${bg}!important; --control-primary-icon-active:${bg}!important;
      --control-secondary-background-default:${panel}!important; --control-secondary-background-hover:${hover}!important;
      --control-secondary-background-active:${hover}!important; --control-secondary-border-default:${border}!important;
      --control-secondary-border-hover:${muted}!important; --control-secondary-border-active:${fg}!important;
      --control-secondary-text-default:${fg}!important; --control-secondary-text-hover:${fg}!important; --control-secondary-text-active:${fg}!important;
      --control-secondary-icon-default:${fg}!important; --control-secondary-icon-hover:${fg}!important; --control-secondary-icon-active:${fg}!important;
      --control-brand-foreground:${fg}!important; --control-brand-foreground-new:${fg}!important;
      --checkbox-border-selected-default:${fg}!important; --radio-border-selected-default:${fg}!important;
      --channels-default:${muted}!important; --channeltextarea-background:${panel}!important;
      --brand-500:#777!important; --brand-500-hsl:0 0% 47%!important; --brand-experiment:#777!important; --text-link:${fg}!important;
      --font-primary:'Segoe UI Variable','Segoe UI',sans-serif!important;
      --font-display:'Segoe UI Variable','Segoe UI',sans-serif!important;
    }
    [data-focus-concealed] { display:none!important; }
    [class*="nowPlayingColumn"], [class*="userPanelOuter"], [class*="userProfileOuterThemed"][class*="sidebar"] { display:none!important; }
    ${settings.hidePromotions ? '[data-testid="quest-bar-container"], [class*="questToast"], [class*="questPromo"] { display:none!important; }' : ''}
    body, [class*="chatContent"] { background:${bg}!important; }
    [class*="sidebarList"], [class*="privateChannels"], [class*="membersWrap"], [class*="panels_"] { background:${panel}!important; }
    [class*="panels_"] { border:1px solid ${border}!important; border-radius:10px!important; box-shadow:none!important; }
    [class*="panels_"] [class*="container_"] { background-image:none!important; }
    [class*="title_"][class*="container_"] { background:${bg}!important; border-bottom:1px solid ${border}!important; box-shadow:none!important; }
    [class*="peopleListItem"] { border-color:${border}!important; border-radius:8px; }
    [class*="peopleListItem"]:hover { background:${panel}!important; }
    [class*="channelTextArea"] { border:1px solid ${border}!important; border-radius:10px!important; }
    [class*="lookFilled"][class*="colorBrand"], [class*="addFriend_"] { background:${fg}!important; color:${bg}!important; }
    [class*="lookFilled"][class*="colorBrand"]:hover { background:${muted}!important; }
    [class*="standardSidebarView"] { background:${bg}!important; }
    [class*="standardSidebarView"] [class*="sidebarRegionScroller"] { background:${panel}!important; border-right:1px solid ${border}; }
    [class*="standardSidebarView"] [class*="contentRegion"] { background:${bg}!important; }
    [class*="standardSidebarView"] [class*="item_"] { border-radius:6px!important; }
    [class*="standardSidebarView"] [class*="selected_"] { background:${hover}!important; color:${fg}!important; }
    [class*="profileContentOuter"] { background:${bg}!important; border:1px solid ${border}; border-radius:16px!important; }
    [class*="profileContentColumns"] { gap:24px!important; }
    [class*="profileBody"] { background:${panel}!important; }
    .focus-profile-activity { margin:16px 0; color:${fg}; }
    .focus-profile-activity:empty { display:none; }
    .focus-profile-activity [class*="tabPanelScroller"] { overflow:visible!important; padding:0!important; height:auto!important; max-height:none!important; flex:initial!important; }
    .focus-profile-activity [class*="card_"] { background:${bg}!important; border:1px solid ${border}; border-radius:8px; }
    .focus-profile-activity img { max-width:100%; }
    [class*="wordmark"] { width:90px!important; }
    [class*="wordmark"] > svg { display:none!important; }
    [class*="wordmark"]::after { content:'FOCUS'; font:600 12px 'Segoe UI',sans-serif; letter-spacing:3px; color:${fg}; }
    [data-list-item-id="guildsnav___home"] svg { visibility:hidden; }
    [data-list-item-id="guildsnav___home"] { background:${fg}!important; border-radius:14px; }
    [data-list-item-id="guildsnav___home"]::after { content:'F'; position:absolute; inset:0; display:grid; place-items:center; font:600 22px 'Segoe UI',sans-serif; color:${bg}; pointer-events:none; }
    [class*="messageListItem"] [class*="groupStart"] { margin-top:${settings.density === 'compact' ? 8 : 16}px!important; }
    ${settings.reduceMotion ? '*,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; }' : ''}
    html[data-focus-background] *,html[data-focus-background] *::before,html[data-focus-background] *::after { animation-play-state:paused!important; }
    ${!settings.showAvatars ? '[id^="chat-messages-"] [class*="avatar"]{visibility:hidden!important}' : ''}
    ${!settings.showEmbeds ? '[id^="chat-messages-"] [class*="embedFull"]{display:none!important}' : ''}
    ${!settings.showStickers ? '[id^="chat-messages-"] [class*="stickerAsset"]{display:none!important}' : ''}
    .focus-settings { color:${fg}; font:14px/1.5 'Segoe UI',sans-serif; max-width:780px; padding:4px 0 24px; }
    .focus-settings * { box-sizing:border-box; }
    .focus-settings h2 { font-size:25px; font-weight:550; letter-spacing:-.7px; margin:4px 0 8px; }
    .focus-settings h3 { font-size:13px; text-transform:uppercase; letter-spacing:1.5px; margin:28px 0 10px; color:${muted}; }
    .focus-settings p { color:${muted}; margin:6px 0 18px; }
    .focus-settings .focus-row { display:flex; justify-content:space-between; align-items:center; gap:20px; min-height:54px; padding:12px 0; border-bottom:1px solid ${hover}; }
    .focus-settings .focus-row small { display:block; color:${muted}; font-size:12px; margin-top:3px; }
    .focus-settings button,.focus-settings select { font:inherit; background:${panel}; color:${fg}; border:1px solid ${muted}; border-radius:6px; padding:7px 12px; cursor:pointer; }
    .focus-settings button:hover { background:${hover}; }
    .focus-settings button:focus-visible,.focus-settings select:focus-visible { outline:2px solid ${fg}; outline-offset:3px; }
    .focus-settings [role="switch"] { flex-shrink:0; width:38px; height:22px; padding:3px; border-radius:7px; display:flex; align-items:center; }
    .focus-settings [role="switch"]::after { content:''; display:block; height:14px; width:14px; background:${muted}; border-radius:3px; }
    .focus-settings [role="switch"][aria-checked="true"] { background:${fg}; justify-content:flex-end; }
    .focus-settings [role="switch"][aria-checked="true"]::after { background:${bg}; }
    .focus-settings .focus-themes { display:flex; gap:10px; flex-wrap:wrap; }
    .focus-settings .focus-themes button { flex:1; min-width:100px; min-height:58px; }
    .focus-settings button[aria-pressed="true"] { outline:2px solid ${fg}; outline-offset:2px; }
    .focus-settings .focus-kicker { font-size:11px; letter-spacing:3px; color:${muted}; }
    .focus-settings .focus-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .focus-settings .focus-stats div { padding:16px; border:1px solid ${hover}; border-radius:6px; }
    .focus-settings .focus-stats strong { display:block; font-size:22px; font-weight:500; }
    `;
}
