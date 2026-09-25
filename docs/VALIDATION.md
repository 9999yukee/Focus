# Validation status

> Historical WebView2 results. Current results: [Focus Desktop validation](DESKTOP_VALIDATION.md).

The WebView2 prototype was superseded by the user's 2026-09-23 request for a desktop integration or independent client. See [the revised direction](DIRECTION_NATIVE_FR.md).

| Check | Observed result |
| --- | --- |
| TypeScript build | Passed |
| ESLint | Passed |
| Frontend unit tests | 9 passed |
| Browser fixture/UI tests | Passed; screenshots explicitly labeled browser preview |
| Cargo formatting | Passed |
| Cargo Clippy, warnings denied | Passed |
| Rust release unit tests | 7 passed |
| Windows release executable | Generated |
| NSIS installer | Generated; installation not tested |
| Native UI smoke test | Failed to locate `Black theme`; not validated |
| Actual Discord sign-in, messages, servers, DMs, voice/video/share | Not verified |
| Performance comparison | Not measured |

No authenticated Discord data, passwords, account tokens or cookies were requested or extracted. No performance values are invented. Test fixtures are isolated from production code.
