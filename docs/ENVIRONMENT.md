# Development environment

Inspected before application coding on 2026-09-22.

| Component | Initial result |
| --- | --- |
| OS | Windows 10 Pro x64, build 18363 |
| Processor | Intel Pentium Silver N6000, 1.10 GHz |
| Physical memory | 8,324,829,184 bytes (~7.75 GiB) |
| Free disk | ~65 GiB |
| Rust / Cargo | 1.98.1, stable x86_64-pc-windows-msvc; installed but absent from session PATH |
| Node / npm | 26.7.0 / 11.19.0; use npm.cmd to avoid PowerShell script-policy conflict |
| pnpm | Installed 10.34.5 automatically |
| WebView2 | Evergreen 153.0.4234.48, per-user installation |
| Visual Studio / SDK | Not initially present; automated Build Tools 2022 C++ workload installation started |
| Git | Not on PATH; not required to build this source snapshot |

Rust and pnpm directories were added to the user PATH. Build scripts also locate Rust in its standard user directory. No global PowerShell execution-policy change is required.

Reference: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Setup outcome

The C++ compiler installed at `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207`. The overall Microsoft installer returned 1603 after its x86 Visual C++ redistributable returned 87; the installation remained marked incomplete. A follow-up elevated SDK setup was canceled at the Windows elevation prompt.

The missing SDK was resolved without further elevation using official `Microsoft.Windows.SDK.CPP` and `.CPP.x64` NuGet packages, version 10.0.19041.5. Headers, libraries and resource tools are held under project-local `.tools`; build wrappers set only child-process environment variables. The compiler successfully ran the complete Cargo check/Clippy pipeline with this setup. Rustfmt and Clippy components were installed through rustup.

Frontend: TypeScript 5.9.3, Vite 7.3.6, Tauri JS API 2.11.1 / CLI 2.11.5, ESLint 10.11.0. Native: Tauri 2.11.6 (pinned), Wry 0.55.1, WebView2 COM 0.38.2. Lockfiles provide the full dependency resolution. No additional application services were installed by Focus.

Microsoft source: [Windows SDK downloads and NuGet distribution](https://learn.microsoft.com/en-us/windows/apps/windows-sdk/downloads).
