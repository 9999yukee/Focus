use crate::{
    hidden_items,
    performance::{PerformanceSample, RendererMetrics},
    resource_manager::AppState,
    settings::{HiddenItem, HiddenKind, Settings},
    state::{lock, AppData},
    window,
};
use serde::Serialize;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, Manager, State, Webview};

// ACLs are also enforced by Tauri. Label checks defend against accidental future capability widening.
fn shell(view: &Webview) -> Result<(), String> {
    if view.label() == "shell" {
        Ok(())
    } else {
        Err("Local shell required.".into())
    }
}
fn discord(view: &Webview) -> Result<(), String> {
    if view.label() == "discord"
        && view
            .url()
            .map(|u| u.scheme() == "https" && u.host_str() == Some("discord.com"))
            .unwrap_or(false)
    {
        Ok(())
    } else {
        Err("Discord presentation view required.".into())
    }
}

#[tauri::command]
pub fn load_settings(webview: Webview, data: State<AppData>) -> Result<Settings, String> {
    shell(&webview)?;
    Ok(lock(&data.settings)?.value.clone())
}

#[tauri::command]
pub fn save_settings(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    settings: Settings,
) -> Result<(), String> {
    shell(&webview)?;
    // Hidden items have separate operations so stale settings cannot accidentally unhide them.
    let saved = {
        let mut store = lock(&data.settings)?;
        let mut next = settings;
        next.hidden_servers = store.value.hidden_servers.clone();
        next.hidden_friends = store.value.hidden_friends.clone();
        store.save(next.clone())?;
        next
    };
    window::push_settings(&app, &saved)?;
    window::push_policy(&app)
}

#[tauri::command]
pub fn set_view(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    visible: bool,
) -> Result<(), String> {
    shell(&webview)?;
    if let Some(remote) = app.get_webview("discord") {
        if visible {
            remote.show()
        } else {
            remote.hide()
        }
        .map_err(|_| "Could not change the Discord view.")?;
    }
    lock(&data.resources)?.view_visible = visible;
    window::push_policy(&app)
}

#[tauri::command]
pub fn window_action(webview: Webview, app: AppHandle, action: String) -> Result<(), String> {
    shell(&webview)?;
    let window = app.get_window("main").ok_or("Window unavailable.")?;
    let result = match action.as_str() {
        "minimize" => window.minimize(),
        "maximize" => {
            if window.is_maximized().unwrap_or(false) {
                window.unmaximize()
            } else {
                window.maximize()
            }
        }
        "close" => window.close(),
        _ => return Err("Unknown window action.".into()),
    };
    result.map_err(|_| "Window action failed.".into())
}

#[tauri::command]
pub fn navigate_discord(
    webview: Webview,
    app: AppHandle,
    destination: String,
) -> Result<(), String> {
    shell(&webview)?;
    let remote = app
        .get_webview("discord")
        .ok_or("Discord view unavailable.")?;
    match destination.as_str() {
        "reload" => remote
            .reload()
            .map_err(|_| "Could not reload Discord.".into()),
        "home" => remote
            .eval("window.__FOCUS__?.navigateHome()")
            .map_err(|_| "Could not open Discord home.".into()),
        "settings" => remote
            .eval("window.__FOCUS__?.openSettings()")
            .map_err(|_| "Could not open Discord settings.".into()),
        _ => Err("Unsupported destination.".into()),
    }
}

#[tauri::command]
pub fn restore_hidden(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    id: String,
    kind: HiddenKind,
) -> Result<(), String> {
    shell(&webview)?;
    let saved = {
        let mut store = lock(&data.settings)?;
        let mut next = store.value.clone();
        hidden_items::restore(&mut next, &id, kind);
        store.save(next.clone())?;
        next
    };
    lock(&data.hidden_unread)?.retain(|value| value != &id);
    window::push_settings(&app, &saved)
}

#[tauri::command]
pub fn open_hidden(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    id: String,
    kind: HiddenKind,
) -> Result<(), String> {
    shell(&webview)?;
    let store = lock(&data.settings)?;
    let exists = store
        .value
        .hidden_servers
        .iter()
        .chain(store.value.hidden_friends.iter())
        .any(|item| item.id == id && item.kind == kind);
    if !exists || !crate::settings::valid_id(&id) {
        return Err("Hidden item not found.".into());
    }
    if kind == HiddenKind::Friend {
        return Err("Open the Friends page to view this user, or restore them first.".into());
    }
    let remote = app
        .get_webview("discord")
        .ok_or("Discord view unavailable.")?;
    let encoded = serde_json::to_string(&HiddenItem {
        id,
        kind,
        label: String::new(),
    })
    .map_err(|_| "Invalid hidden item.")?;
    // Use existing public navigation links, preserving the current page and active voice.
    remote
        .eval(format!("window.__FOCUS__?.openHidden({encoded})"))
        .map_err(|_| "Could not open hidden item.".into())
}

#[tauri::command]
pub fn bridge_ready(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    status: String,
) -> Result<(), String> {
    discord(&webview)?;
    match status.as_str() {
        "ready" => {
            data.discord_ready.store(true, Ordering::Relaxed);
            let settings = lock(&data.settings)?.value.clone();
            window::push_settings(&app, &settings)?;
            window::push_policy(&app)?;
            let monitor = lock(&data.resources)?.monitor;
            webview
                .eval(format!("window.__FOCUS__?.monitor({monitor})"))
                .map_err(|_| "Monitor configuration failed.")?;
        }
        "settings-unavailable" | "hidden-unavailable" => {}
        _ => return Err("Unknown presentation status.".into()),
    }
    app.emit_to("shell", "discord-status", status)
        .map_err(|_| "Could not update status.".into())
}

#[tauri::command]
pub fn bridge_hide(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    item: HiddenItem,
) -> Result<(), String> {
    discord(&webview)?;
    let saved = {
        let mut store = lock(&data.settings)?;
        let mut next = store.value.clone();
        hidden_items::hide(&mut next, item)?;
        store.save(next.clone())?;
        next
    };
    window::push_settings(&app, &saved)
}

#[tauri::command]
pub fn bridge_unread(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    ids: Vec<String>,
) -> Result<(), String> {
    discord(&webview)?;
    if ids.len() > 500 {
        return Err("Too many hidden indicators.".into());
    }
    let store = lock(&data.settings)?;
    let valid: Vec<String> = ids
        .into_iter()
        .filter(|id| store.value.hidden_friends.iter().any(|item| item.id == *id))
        .collect();
    let count = valid.len();
    *lock(&data.hidden_unread)? = valid;
    app.emit_to("shell", "hidden-unread", count)
        .map_err(|_| "Could not update hidden indicators.".into())
}

#[tauri::command]
pub fn bridge_metrics(
    webview: Webview,
    data: State<AppData>,
    metrics: RendererMetrics,
) -> Result<(), String> {
    discord(&webview)?;
    if !lock(&data.resources)?.monitor || !metrics.valid() {
        return Err("Metrics disabled or invalid.".into());
    }
    *lock(&data.renderer)? = Some(metrics);
    Ok(())
}

#[tauri::command]
pub fn set_monitor(
    webview: Webview,
    app: AppHandle,
    data: State<AppData>,
    enabled: bool,
) -> Result<(), String> {
    shell(&webview)?;
    lock(&data.resources)?.monitor = enabled;
    if !enabled {
        *lock(&data.renderer)? = None;
    }
    if let Some(remote) = app.get_webview("discord") {
        remote
            .eval(format!("window.__FOCUS__?.monitor({enabled})"))
            .map_err(|_| "Could not change diagnostics.")?;
    }
    Ok(())
}

#[tauri::command]
pub fn sample_performance(
    webview: Webview,
    data: State<AppData>,
) -> Result<PerformanceSample, String> {
    shell(&webview)?;
    let startup = data.shell_ready_ms.load(Ordering::Relaxed);
    let background = lock(&data.resources)?.state != AppState::Focused;
    let renderer = lock(&data.renderer)?.clone();
    let result =
        lock(&data.performance)?.sample((startup > 0).then_some(startup), renderer, background);
    result
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    discord_ready: bool,
    policy: crate::resource_manager::ResourcePolicy,
    hidden_unread: usize,
    startup_ms: u64,
    start_in_settings: bool,
}

#[tauri::command]
pub fn get_status(webview: Webview, data: State<AppData>) -> Result<Status, String> {
    shell(&webview)?;
    let elapsed = data.started.elapsed().as_millis() as u64;
    let _ = data.shell_ready_ms.compare_exchange(
        0,
        elapsed.max(1),
        Ordering::Relaxed,
        Ordering::Relaxed,
    );
    let mode = lock(&data.settings)?.value.background_mode;
    Ok(Status {
        discord_ready: data.discord_ready.load(Ordering::Relaxed),
        policy: lock(&data.resources)?.policy(mode),
        hidden_unread: lock(&data.hidden_unread)?.len(),
        startup_ms: data.shell_ready_ms.load(Ordering::Relaxed),
        start_in_settings: std::env::args().any(|arg| arg == "--settings"),
    })
}

#[tauri::command]
pub fn export_benchmark(
    webview: Webview,
    app: AppHandle,
    scenario: String,
    samples: serde_json::Value,
) -> Result<String, String> {
    shell(&webview)?;
    let allowed = [
        "dm-idle",
        "server-idle",
        "scroll",
        "gif-picker",
        "voice",
        "voice-screen-share",
        "minimized",
        "restore",
        "login-idle",
        "viewport-lab",
    ];
    if !allowed.contains(&scenario.as_str()) {
        return Err("Unknown benchmark scenario.".into());
    }
    let array = samples.as_array().ok_or("Expected a sample array.")?;
    if array.is_empty() || array.len() > 600 {
        return Err("A benchmark needs 1–600 samples.".into());
    }
    let bytes = serde_json::to_vec_pretty(&serde_json::json!({ "schema": 1, "scenario": scenario, "scope": "Focus native process and descendant WebView2 processes", "samples": samples })).map_err(|_| "Could not encode benchmark.")?;
    if bytes.len() > 2_000_000 {
        return Err("Benchmark is too large.".into());
    }
    let directory = app
        .path()
        .app_local_data_dir()
        .map_err(|_| "Benchmark folder unavailable.")?
        .join("benchmarks");
    std::fs::create_dir_all(&directory).map_err(|_| "Could not create benchmark folder.")?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let path = directory.join(format!("{scenario}-{stamp}.json"));
    std::fs::write(&path, bytes).map_err(|_| "Could not save benchmark.")?;
    Ok(path.to_string_lossy().into_owned())
}
