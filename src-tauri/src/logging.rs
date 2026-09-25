use log::{LevelFilter, Log, Metadata, Record};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

struct RotatingLogger {
    path: Mutex<PathBuf>,
    level: LevelFilter,
}
impl Log for RotatingLogger {
    fn enabled(&self, metadata: &Metadata<'_>) -> bool {
        metadata.level() <= self.level && metadata.target().starts_with("focus")
    }
    fn log(&self, record: &Record<'_>) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let Ok(path) = self.path.lock() else {
            return;
        };
        if fs::metadata(&*path)
            .map(|m| m.len() > 256 * 1024)
            .unwrap_or(false)
        {
            let _ = fs::rename(&*path, path.with_extension("log.1"));
        }
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&*path) {
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            let _ = writeln!(file, "{stamp} {} {}", record.level(), record.args());
        }
    }
    fn flush(&self) {}
}

pub fn init(directory: PathBuf) {
    let _ = fs::create_dir_all(&directory);
    let level = if cfg!(debug_assertions) {
        LevelFilter::Info
    } else {
        LevelFilter::Warn
    };
    let logger = Box::leak(Box::new(RotatingLogger {
        path: Mutex::new(directory.join("focus.log")),
        level,
    }));
    if log::set_logger(logger).is_ok() {
        log::set_max_level(level);
    }
}
