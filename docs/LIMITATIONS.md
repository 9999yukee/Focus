# Known limitations and release gate

> Archive du prototype WebView2 0.1. Voir [les limites de la version Desktop](../desktop/README.md#portée-exacte).

Focus V1 is an official-web-client wrapper, not a new Discord backend. Automated test results are kept separate from authenticated compatibility results.

## Preserved through Discord

The embedded official client remains responsible for servers/channels/categories, DMs/group DMs, message send/replies/reactions/mentions, attachments, embeds, emoji/stickers, threads/search, profiles/friends, roles/permissions, invitations/moderation, microphone/speaker controls, voice, video and screen sharing. Focus does not reimplement or automate those operations.

This preserves the available web experience; it does **not** prove each feature works in this machine's WebView2 runtime. Signed-in tests are required for acceptance. System audio sharing, capture permissions, devices and notification behavior can differ from Discord's desktop application. Focus cannot guarantee desktop Electron feature parity.

## Implemented wrapper optimizations

* Plain TypeScript local shell; no React, downloaded fonts or production mock data.
* Shared WebView2 profile/environment configuration; no extra Focus helper processes.
* Settings page DOM exists only while viewed. Synthetic lab DOM is destroyed when closed.
* Event-driven focus/minimize policies; no Discord webview suspension.
* Background CSS animation pause; reduced motion enabled by default.
* Intersection-based pause of off-screen message attachment videos; live streams/audio excluded.
* PNG substitution for recognizable Discord CDN GIF avatars and emoji when disabled.
* Best-effort positive selectors for promotional navigation and banners.
* Local server/friend/DM hiding, restore, and an observed hidden-DM unread count.
* Two-second diagnostics only when enabled; frame sampler only while visible and focused.
* Weighted LRU, dynamic overscan, measured-height calculations and tiny frozen state in the explicit synthetic viewport lab.
* Native counter collection, bounded benchmark output and rotating logs.

## Optimizations blocked by renderer ownership

| Requested optimization | V1 boundary |
| --- | --- |
| Force Discord to render only 40–80 messages | Discord owns its React tree. Only the synthetic lab enforces this. |
| Virtualize members/channels/servers/DMs/pickers | Discord owns these lists. No external node deletion or fake virtualizer. |
| Truly unload hidden server/friend state | CSS hides navigation; Discord may retain subscriptions, caches and avatars. |
| Freeze channels with drafts/scroll and destroy their React trees | Only Focus-owned experimental views can do this. Discord handles real drafts/navigation. |
| Bound Discord's avatar, GIF, image/video or disk caches | Browser/frontend internals. Focus's LRU does not constrain them. |
| Stop every off-screen GIF or Lottie animation | CSS cannot guarantee decoded-frame eviction. Only recognized avatar/emoji GIF URLs get static variants. |
| Reduce WebRTC work while minimized | Intentionally excluded; voice reliability takes priority. |
| Disable all cosmetic timers or network prefetch | Discord owns timers/networking. Focus only stops its own unnecessary work. |
| Literal single-process application | Incompatible with WebView2's process model. |
| Universal marketing removal | DOM changes, localization, modal layouts and route changes can evade selectors. |
| Exactly six Discord settings categories | Focus has six categories; advanced account/device controls open Discord's original settings. |

## Presentation and hidden items

Selectors are conservative and not a stable Discord contract. Unknown layouts are left intact. A server's hidden icon can leave layout space in some Discord sidebar versions. Right-click Hide works only when the page exposes a stable ID. Shift + right-click is a fallback. Hidden friend rows require a recognized `people-list` ID; unsupported layouts must be documented or restored through Discord rather than guessed.

Opening a hidden item uses an existing DOM navigation link. If Discord has unmounted that link, Focus reports that it cannot open it and offers Restore. Hiding an item does not clear the currently open conversation. No server membership, friendship, mute or message state is modified remotely.

Unread counts depend on mounted hidden DM links and observable badges. No gateway interception or hidden-user monitoring is used. The count may be incomplete and is labeled as an observed indicator, not an authoritative unread total. New messages never automatically remove a hidden preference.

The entire Discord view is grayscale, including images, videos and screen shares, as required by the monochrome brief. The static filter can add compositing cost. Black/Gray/White override supported CSS variables; unusual third-party embeds and browser-native permission dialogs may retain their own layout/theme. Density and embed/sticker selectors can change with Discord releases.

## Notifications

Enable **Allow desktop notifications** in Focus, restart, and enable desktop notifications in Discord. Focus handles WebView2's notification permission event only for the exact Discord HTTPS origin. The runtime handles notification contents and display. Permission decisions are not saved into the WebView2 profile; the local setting applies at launch. Camera and microphone keep WebView2's normal permission behavior.

WebView2 does not provide a default notification permission prompt, and push notifications while the application is closed are unavailable. No Focus daemon is installed to receive them. Windows settings and Focus Assist can suppress notifications. Authenticated delivery still needs a manual test.

## Measurements and support

Unavailable metrics remain blank: GPU utilization, exact decoded-image/GIF allocation, internal cache bytes and messages retained in Discord memory. Images loaded and message DOM nodes are explicitly named approximations. Summed working sets include duplicate shared pages. Monitor/benchmark instrumentation adds overhead.

The Tauri child-webview API requires its `unstable` feature; the crate version is pinned and upgrades need regression tests. WebView2 remains Evergreen and can change independently. Installer signing is not configured; a production publisher must supply a signing certificate. The installer requires internet to fetch WebView2 on machines without it; the application itself always needs internet for Discord.
