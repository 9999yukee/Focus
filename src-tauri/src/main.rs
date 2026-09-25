#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod hidden_items;
mod logging;
mod notifications;
mod performance;
mod resource_manager;
mod settings;
mod state;
mod window;

use std::time::Instant;
use tauri::Manager;

fn main() {
    let started = Instant::now();
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            window::show_main(app);
        }))
        .setup(move |app| {
            let directory = app.path().app_local_data_dir()?;
            logging::init(directory.join("logs"));
            let settings =
                settings::SettingsStore::open(&directory).map_err(std::io::Error::other)?;
            app.manage(state::AppData::new(settings, started));
            window::create(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_settings,
            commands::save_settings,
            commands::set_view,
            commands::window_action,
            commands::navigate_discord,
            commands::restore_hidden,
            commands::open_hidden,
            commands::sample_performance,
            commands::set_monitor,
            commands::export_benchmark,
            commands::bridge_ready,
            commands::bridge_hide,
            commands::bridge_metrics,
            commands::bridge_unread,
            commands::get_status,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|_| {
            log::error!(
                "Application startup failed. Check local settings and WebView2 installation."
            );
            #[cfg(windows)]
            unsafe {
                use windows::{core::w, Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_OK}};
                MessageBoxW(None, w!("Focus could not start.\n\nCheck the WebView2 Runtime and the local settings file at:\n%LOCALAPPDATA%\\app.focus.desktop\\settings.json\n\nInvalid settings are preserved, never overwritten."), w!("Focus"), MB_OK);
            }
            std::process::exit(1);
        });
}
