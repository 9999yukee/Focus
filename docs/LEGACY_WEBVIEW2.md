# Focus

> **Orientation révisée le 23 septembre 2026 :** l'utilisateur demande une intégration à Discord Desktop ou un client réellement implémenté, sans embarquer Discord Web. Le code et l'installeur ci-dessous sont le prototype WebView2 antérieur ; ils ne constituent pas la solution demandée après cette précision. La poursuite de cette architecture est arrêtée. Voir [le cadrage de la nouvelle architecture](docs/DIRECTION_NATIVE_FR.md).

**Communication, without the clutter.** A Windows desktop shell for the official Discord web client, built with Rust, Tauri 2, WebView2 and plain TypeScript.

Black. Gray. White. Six settings categories. One Focus executable, plus the browser processes managed by WebView2.

This is a **V1 preview**, with an explicit compatibility boundary: Discord provides login, messages, servers, DMs and calls. Focus supplies the native window, local preferences, presentation policies and diagnostics. There is no custom Discord API client, user-token handling, self-bot, launcher daemon or fake chat data. Authenticated Discord workflows require a manual acceptance pass; see [validation](docs/VALIDATION.md) and [limitations](docs/LIMITATIONS.md).

## Run on Windows

Use the Windows x64 installer in `src-tauri/target/release/bundle/nsis/`, or run `src-tauri/target/release/focus.exe` directly on a machine with WebView2. Release deliverables are also copied into `artifacts/release/` when packaged for handoff.

The installer installs for the current Windows user and downloads WebView2 when needed. End users need no Rust, Node, pnpm, Visual Studio or SDK. Internet is required. The preview is unsigned.

Sign in through Discord's own page. Focus never asks you to paste credentials or tokens. Local preferences are in `%LOCALAPPDATA%\app.focus.desktop\settings.json`; the adjacent `webview` folder is WebView2's private per-user profile. **Do not share that profile.** Only source, builds, screenshots of Focus settings and non-sensitive benchmark reports belong in a project archive.

## Everyday controls

* **Settings:** top bar or lower-left gear. Account, Audio & Video, Notifications, Privacy, Appearance and Performance are the only primary categories.
* **Hide locally:** right-click a supported server/friend/DM and choose **Hide … in Focus**. Shift + right-click opens Focus's menu directly. Manage and restore items from **Privacy → Hidden items** or the crossed-eye rail button. Hidden items remain joined/friended; new messages never permanently unhide them.
* **Calls:** use Discord's normal microphone, speaker, camera and share controls. Focus keeps the Discord webview and realtime media alive while minimized or viewing settings.
* **Notifications:** enable **Allow desktop notifications**, restart Focus, and enable Discord desktop notifications. Focus must remain running; Windows notification settings apply.
* **Window:** close exits by default. Enable **Keep Focus in the tray** under Account to keep calls running after closing the window. The tray offers **Show Focus** and **Quit Focus**.
* **Performance:** enable the monitor for process-tree memory/CPU and observable Discord DOM/frame metrics. A compact readout remains in the footer while you use Discord. Disable it to remove instrumentation overhead.
* **Viewport lab:** Performance → Open viewport lab. The 30,000 numbered rows are explicitly synthetic. This demonstrates Focus's own engine and makes no claim about Discord's internal React renderer.

`Ctrl+,` opens settings and `Esc` returns to Discord when the **local shell** has keyboard focus. The toolbar works while Discord has focus. Account/device shortcuts try supported public DOM controls; if unavailable or localized, use Discord's own gear.

## Develop

Windows 10/11 x64, Rust stable MSVC, Node 22.12+ (tested on 26.7), pnpm 10, Visual Studio C++ Build Tools, a Windows SDK, and WebView2 are required. Exact versions and this machine's setup are in [ENVIRONMENT.md](docs/ENVIRONMENT.md).

```sh
pnpm install
pnpm tauri dev
```

```sh
pnpm tauri build
```

In Windows PowerShell with a restrictive script policy, use `pnpm.cmd` instead of `pnpm`; no global policy change is needed. The Tauri wrapper adds the standard user Rust/pnpm paths to its child environment. It builds the guarded presentation script before native compilation. The Vite watcher excludes native build output.

On the test machine the Microsoft system installer left the SDK incomplete. `scripts/setup-sdk.ps1` downloads Microsoft's official SDK NuGet packages into `.tools`; `scripts/windows-env.mjs` combines those with the installed MSVC compiler. This fallback is development-only and is never bundled with the app. A normal complete C++ workload needs no fallback.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-sdk.ps1
pnpm.cmd tauri build
```

## Verify

```sh
pnpm lint
pnpm test
pnpm build
node scripts/rust.mjs fmt --check
node scripts/rust.mjs clippy -- -D warnings
node scripts/rust.mjs test --release
```

The `rust.mjs` wrapper runs Cargo in `src-tauri` with the detected Windows toolchain environment. In a normal configured developer terminal, the equivalent commands are `cargo fmt`, `cargo clippy -- -D warnings`, and `cargo test` from `src-tauri`.

For browser tests, start `pnpm dev` and run `pnpm test:ui` in a second terminal. Tests use installed Microsoft Edge when available; otherwise install a Playwright Chromium browser with `pnpm exec playwright install chromium`. All Discord-looking test fixtures are confined to the test runner, with network requests intercepted. Production paths never use them.

After a release build, close Focus and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/native-smoke.ps1
```

This opens the real Windows app, verifies local persistence, exercises controls, captures settings screenshots, and checks single-instance/minimize/restore behavior. It never signs in, sends a message or reads a credential.

## Measure

In-app Performance captures 30 seconds of a manually selected scenario and exports JSON to `%LOCALAPPDATA%\app.focus.desktop\benchmarks`. Select a scenario only while actually performing that activity. This is measurement, not automated messaging or calling.

The external harness measures process startup and process-tree counters. Close the previous test application before each trial; the harness leaves windows open for inspection and never terminates a call.

```powershell
pnpm.cmd benchmark -Target Focus -Seconds 30 -Scenario login-idle
pnpm.cmd benchmark -Target Focus -Seconds 30 -Scenario minimized -Minimized
pnpm.cmd benchmark -Target OfficialWeb -Seconds 30 -Scenario login-idle
```

`OfficialWeb` is the unmodified official Discord website in an isolated Microsoft Edge app profile. It is **not** a measurement of the Discord Electron desktop app. Startup is process launch to a native window, not authenticated chat readiness. A true OS-cold startup requires a separately controlled reboot/cache protocol. See [the benchmark report](docs/BENCHMARK_REPORT.md) for results, omissions and measurement conditions.

## Project map

| Location | Responsibility |
| --- | --- |
| `src/app`, `src/views`, `src/components` | Local TypeScript shell |
| `src/discord` | Origin-guarded DOM presentation adapter |
| `src/virtualization` | Experimental variable-height viewport engine |
| `src/media` | Attachment policies and bounded LRU |
| `src/performance` | Opt-in frame/counter UI and capture |
| `src-tauri/src` | Native window, storage, state, metrics and permissions |
| `tests`, `scripts` | Unit tests, UI fixtures, native checks and benchmarks |
| `docs` | Architecture, evidence, limitations and roadmap |

Read [architecture](docs/ARCHITECTURE.md), [implemented/blocked optimizations](docs/LIMITATIONS.md), [native renderer research](docs/NATIVE_RENDERER_RESEARCH.md), and [roadmap](docs/ROADMAP.md). Screenshots are in `artifacts/screenshots`; filenames distinguish desktop captures from browser previews.

Focus is an independent project, not an official Discord product.
