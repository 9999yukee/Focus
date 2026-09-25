use crate::{
    settings::Settings,
    state::{lock, AppData},
};
use std::sync::atomic::Ordering;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::{NewWindowResponse, WebviewBuilder},
    window::WindowBuilder,
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WindowEvent,
};

pub const LEFT: f64 = 56.0;
pub const TOP: f64 = 48.0;
pub const BOTTOM: f64 = 26.0;

pub fn create(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window = WindowBuilder::new(app, "main")
        .title("Focus")
        .inner_size(1180.0, 780.0)
        .min_inner_size(760.0, 520.0)
        .decorations(false)
        .visible(false)
        .build()?;
    let profile = app.path().app_local_data_dir()?.join("webview");
    let args = "--disable-features=msWebOOUI,msPdfOOUI";
    let local = WebviewBuilder::new("shell", WebviewUrl::App("index.html".into()))
        .data_directory(profile.clone())
        .additional_browser_args(args)
        .devtools(cfg!(debug_assertions))
        .disable_drag_drop_handler();
    window.add_child(
        local,
        LogicalPosition::new(0.0, 0.0),
        LogicalSize::new(1180.0, 780.0),
    )?;

    let handle = app.handle().clone();
    let native = app.handle().clone();
    let remote = WebviewBuilder::new(
        "discord",
        WebviewUrl::External("https://discord.com/app".parse()?),
    )
    .data_directory(profile)
    .additional_browser_args(args)
    .devtools(cfg!(debug_assertions))
    .disable_drag_drop_handler()
    .initialization_script(include_str!("../bridge.js"))
    .on_navigation(move |url| {
        if url.scheme() == "https" && url.host_str() == Some("discord.com") {
            return true;
        }
        if matches!(url.scheme(), "https" | "http") {
            open_external(url);
        }
        false
    })
    .on_new_window(move |url, _| {
        open_external(&url);
        NewWindowResponse::Deny
    })
    .on_page_load(move |_, payload| {
        if matches!(payload.event(), tauri::webview::PageLoadEvent::Started) {
            handle
                .state::<AppData>()
                .discord_ready
                .store(false, Ordering::Relaxed);
            let _ = handle.emit_to("shell", "discord-status", "loading");
        }
    });
    let discord_view = window.add_child(
        remote,
        LogicalPosition::new(LEFT, TOP),
        LogicalSize::new(1180.0 - LEFT, 780.0 - TOP - BOTTOM),
    )?;
    let notifications_enabled = lock(&app.state::<AppData>().settings)
        .map(|store| store.value.desktop_notifications)
        .unwrap_or(false);
    crate::notifications::install(&discord_view, notifications_enabled)?;
    window.on_window_event(move |event| {
        let Some(window) = native.get_window("main") else {
            return;
        };
        match event {
            WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => {
                resize(&native);
                update_state(
                    &native,
                    window.is_focused().unwrap_or(false),
                    window.is_minimized().unwrap_or(false),
                );
            }
            WindowEvent::Focused(focused) => {
                update_state(&native, *focused, window.is_minimized().unwrap_or(false))
            }
            WindowEvent::CloseRequested { api, .. } => {
                let data = native.state::<AppData>();
                let close_to_tray = lock(&data.settings)
                    .map(|s| s.value.close_to_tray)
                    .unwrap_or(false);
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                    update_state(&native, false, true);
                }
            }
            _ => {}
        }
    });
    let show = MenuItem::with_id(app, "show", "Show Focus", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Focus", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let mut tray = TrayIconBuilder::new()
        .tooltip("Focus")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    window.show()?;
    Ok(())
}

pub fn resize(app: &AppHandle) {
    let Some(window) = app.get_window("main") else {
        return;
    };
    let (Ok(size), Ok(scale)) = (window.inner_size(), window.scale_factor()) else {
        return;
    };
    if size.width == 0 || size.height == 0 {
        return;
    }
    let size = size.to_logical::<f64>(scale);
    if let Some(shell) = app.get_webview("shell") {
        let _ = shell.set_size(size);
    }
    if let Some(discord) = app.get_webview("discord") {
        let _ = discord.set_position(LogicalPosition::new(LEFT, TOP));
        let _ = discord.set_size(LogicalSize::new(
            (size.width - LEFT).max(1.0),
            (size.height - TOP - BOTTOM).max(1.0),
        ));
    }
}

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    update_state(app, true, false);
}

pub fn update_state(app: &AppHandle, focused: bool, minimized: bool) {
    let data = app.state::<AppData>();
    let changed = lock(&data.resources)
        .map(|mut r| r.transition(focused, minimized))
        .unwrap_or(false);
    if changed {
        let _ = push_policy(app);
    }
}

pub fn push_policy(app: &AppHandle) -> Result<(), String> {
    let data = app.state::<AppData>();
    let background = lock(&data.settings)?.value.background_mode;
    let policy = lock(&data.resources)?.policy(background);
    let encoded =
        serde_json::to_string(&policy).map_err(|_| "Could not encode resource policy.")?;
    if let Some(webview) = app.get_webview("discord") {
        webview
            .eval(format!("window.__FOCUS__?.setPolicy({encoded})"))
            .map_err(|_| "Could not apply resource policy.")?;
    }
    app.emit_to("shell", "resource-policy", policy)
        .map_err(|_| "Could not notify the shell.".into())
}

pub fn push_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let encoded = serde_json::to_string(settings).map_err(|_| "Could not encode preferences.")?;
    if let Some(webview) = app.get_webview("discord") {
        webview
            .eval(format!("window.__FOCUS__?.configure({encoded})"))
            .map_err(|_| "Could not apply preferences.")?;
    }
    app.emit_to("shell", "settings-changed", settings)
        .map_err(|_| "Could not update the shell.".into())
}

pub fn open_external(url: &tauri::Url) {
    if !matches!(url.scheme(), "https" | "http") {
        return;
    }
    #[cfg(windows)]
    unsafe {
        use windows::{
            core::PCWSTR,
            Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL},
        };
        let operation: Vec<u16> = "open\0".encode_utf16().collect();
        let value: Vec<u16> = url.as_str().encode_utf16().chain(Some(0)).collect();
        let _ = ShellExecuteW(
            None,
            PCWSTR(operation.as_ptr()),
            PCWSTR(value.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );
    }
}
