use crate::{
    performance::{PerformanceMonitor, RendererMetrics},
    resource_manager::ResourceManager,
    settings::SettingsStore,
};
use std::{
    sync::{
        atomic::{AtomicBool, AtomicU64},
        Mutex,
    },
    time::Instant,
};

pub struct AppData {
    pub settings: Mutex<SettingsStore>,
    pub resources: Mutex<ResourceManager>,
    pub performance: Mutex<PerformanceMonitor>,
    pub renderer: Mutex<Option<RendererMetrics>>,
    pub hidden_unread: Mutex<Vec<String>>,
    pub started: Instant,
    pub shell_ready_ms: AtomicU64,
    pub discord_ready: AtomicBool,
}

impl AppData {
    pub fn new(settings: SettingsStore, started: Instant) -> Self {
        Self {
            settings: Mutex::new(settings),
            resources: Mutex::new(ResourceManager::default()),
            performance: Mutex::new(PerformanceMonitor::default()),
            renderer: Mutex::new(None),
            hidden_unread: Mutex::new(vec![]),
            started,
            shell_ready_ms: AtomicU64::new(0),
            discord_ready: AtomicBool::new(false),
        }
    }
}

pub fn lock<T>(value: &Mutex<T>) -> Result<std::sync::MutexGuard<'_, T>, String> {
    value
        .lock()
        .map_err(|_| "An internal state lock failed. Restart Focus.".into())
}
