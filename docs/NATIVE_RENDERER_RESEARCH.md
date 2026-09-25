# Native renderer research — 2026-09-22

## Finding

A fully native, general-purpose replacement for the Discord user client is **blocked pending an explicitly supported and approved backend**. This is a feasibility conclusion from the documented scope of the official offerings, not a claim that no Discord user-facing integration exists.

The official Social SDK does support real social functionality: account authorization, friends, DMs, lobbies, and linking eligible Discord channels to a game's chat. Recent release notes add guild/channel metadata and channel-related features. It deserves evaluation with Discord; saying that the only supported interface is a bot would be inaccurate.

These documented game integration capabilities do not establish support for this brief's complete standalone client: unrestricted server browsing, every user's channels and history, threads, permissions/moderation, all DMs/group DMs, voice/video/screen share parity, and the full account/settings surface. Scope names or the existence of a method do not establish approval to ship a full replacement client. Several OAuth/RPC scopes require approval. No private user token or normal-account self-bot adapter is acceptable.

## Approval questions

1. Does Discord authorize a standalone desktop communication client using Social SDK or another supported interface?
2. Which user/guild/channel, DM/group DM, history/search, thread, attachment, presence and moderation operations are permitted?
3. Can supported APIs provide voice, video and screen capture without the official desktop client or Chromium? What processes and licensed binaries are required?
4. What consent flow and data storage are required? This project's brief prohibits Focus-owned credential/token handling; any OAuth-based native design would need an explicitly agreed, supported credential model before implementation.
5. What distribution, branding, accessibility, security and rate-limit conditions apply?

Until those are answered, native renderer work must use clearly labeled synthetic adapters only. None is wired into production in V1.

## Proposed boundaries

| Interface | Responsibility | Production status |
| --- | --- | --- |
| `DiscordBackend` | Authorized session and capability discovery | Blocked |
| `MessageBackend` | Permission-checked paging, send, edit, replies and reactions | Blocked |
| `VoiceBackend` | Devices, secure voice transport and live media | Blocked |
| `PresenceBackend` | Authorized presence and relevant subscriptions | Blocked |

A Windows renderer could use DirectWrite/Direct2D or a compact native Rust UI layer, retain only visible row layouts, and use bounded media caches. HOT/WARM/COLD states would belong to the renderer; FROZEN views would retain scroll/draft metadata. Backend events would update narrow stores rather than rerendering whole lists. Audio transport would live outside viewport lifetime and on suitable audio threads.

One executable and potentially one OS process are research objectives. Codec implementations, SDK architecture, screen-capture isolation, crash containment and accessibility may justify additional processes. No process-count promise is made before a working, measured implementation.

## Evidence

* [Social SDK overview](https://discord.com/developers/docs/social-sdk/index.html) describes the game integration and linked-channel model.
* [Social SDK release notes](https://discord.com/developers/docs/social-sdk/release_notes.html) document expanding guild/channel and messaging support.
* [Social SDK authentication](https://discord.com/developers/docs/social-sdk/authentication.html) documents authorization and provisional accounts.
* [OAuth2 documentation](https://discord.com/developers/docs/topics/oauth2) lists scopes and approval conditions.
* [Discord's self-bot policy](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots) prohibits automating normal user accounts outside supported OAuth2/bot APIs.
