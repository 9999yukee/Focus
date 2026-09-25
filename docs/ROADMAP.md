# Roadmap

1. **Authenticated acceptance pass:** Windows 10 and 11, real large servers/DMs, friend-row identification, message operations, attachments, notifications, voice, video, screen sharing, minimize/restore during calls. Record outcomes and measured numbers without copying private messages or credentials.
2. **Adapter hardening:** maintain fixtures for supported Discord layouts and locales; add selectors only after inspecting real public DOM; detect and explain unsupported hide targets; improve hidden-row unread observation without scanning all components.
3. **Performance evidence:** repeated warmed and truly cold startup trials, matched account/scenario A/B tests, 1,000+ message scroll recordings, voice and screen-share CPU, battery/GPU diagnostics using Windows tools. Optimize against measured responsiveness first.
4. **Production packaging:** code signing, accessibility audit, keyboard shortcuts across both webviews, complete installer upgrade/uninstall checks, automated Windows CI, versioned compatibility notes.
5. **Media experiments:** measure the grayscale filter, expand safe static-image support, and explore off-screen image/GIF resource release only where it preserves Discord correctness. No internal React patching.
6. **Native feasibility:** engage Discord about a supported standalone backend and the Social SDK. Advance the native renderer only behind supported capabilities; keep all synthetic data in explicit research/test modes.

No automatic updater daemon, private user-token adapter, or unsupported account automation is planned.
