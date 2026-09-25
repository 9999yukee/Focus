fn main() {
    println!("cargo:rerun-if-changed=bridge.js");
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "load_settings",
            "save_settings",
            "set_view",
            "window_action",
            "navigate_discord",
            "restore_hidden",
            "open_hidden",
            "sample_performance",
            "set_monitor",
            "export_benchmark",
            "bridge_ready",
            "bridge_hide",
            "bridge_metrics",
            "bridge_unread",
            "get_status",
        ]),
    ))
    .expect("Tauri build configuration is invalid");
}
