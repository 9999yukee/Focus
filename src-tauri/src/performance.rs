use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    time::Instant,
};

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RendererMetrics {
    pub dom_nodes: u32,
    pub messages_rendered: u32,
    pub images_loaded: u32,
    pub video_playing: u32,
    pub fps: Option<f64>,
    pub frame_time_ms: Option<f64>,
    pub frame_p95_ms: Option<f64>,
    pub estimated_dropped_frames: u32,
    pub long_tasks: u32,
    pub observed_at_ms: f64,
}

impl RendererMetrics {
    pub fn valid(&self) -> bool {
        self.dom_nodes <= 5_000_000
            && self.messages_rendered <= self.dom_nodes
            && self.images_loaded <= self.dom_nodes
            && self.observed_at_ms.is_finite()
            && [self.fps, self.frame_time_ms, self.frame_p95_ms]
                .iter()
                .flatten()
                .all(|v| v.is_finite() && *v >= 0.0 && *v < 1_000_000.0)
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceSample {
    pub elapsed_ms: u64,
    pub working_set_bytes: u64,
    pub private_bytes: u64,
    pub cpu_percent: Option<f64>,
    pub idle_cpu_estimate: Option<f64>,
    pub process_count: usize,
    pub webview_process_count: usize,
    pub measured_processes: usize,
    pub memory_load_percent: u32,
    pub startup_ms: Option<u64>,
    pub renderer: Option<RendererMetrics>,
}

#[derive(Debug)]
struct ProcessReading {
    pid: u32,
    parent: u32,
    webview: bool,
    working_set: u64,
    private: u64,
    cpu_ticks: Option<u64>,
    created: u64,
}

pub struct PerformanceMonitor {
    started: Instant,
    previous: Option<Instant>,
    cpu: HashMap<(u32, u64), u64>,
    idle_samples: std::collections::VecDeque<f64>,
}

impl Default for PerformanceMonitor {
    fn default() -> Self {
        Self {
            started: Instant::now(),
            previous: None,
            cpu: HashMap::new(),
            idle_samples: Default::default(),
        }
    }
}

fn descendants(rows: &[ProcessReading], root: u32) -> HashSet<u32> {
    let mut ids = HashSet::from([root]);
    loop {
        let count = ids.len();
        for row in rows {
            if ids.contains(&row.parent) && row.webview {
                ids.insert(row.pid);
            }
        }
        if count == ids.len() {
            return ids;
        }
    }
}

impl PerformanceMonitor {
    pub fn sample(
        &mut self,
        startup: Option<u64>,
        renderer: Option<RendererMetrics>,
        background: bool,
    ) -> Result<PerformanceSample, String> {
        let rows = read_processes()?;
        let included = descendants(&rows, std::process::id());
        let now = Instant::now();
        let mut delta = 0_u64;
        let mut known = false;
        let mut working_set = 0;
        let mut private = 0;
        let mut webviews = 0;
        let mut measured = 0;
        let mut cpu = HashMap::new();
        for row in rows.iter().filter(|r| included.contains(&r.pid)) {
            working_set += row.working_set;
            private += row.private;
            if row.webview {
                webviews += 1;
            }
            if let Some(ticks) = row.cpu_ticks {
                measured += 1;
                let key = (row.pid, row.created);
                if let Some(previous) = self.cpu.get(&key) {
                    delta += ticks.saturating_sub(*previous);
                    known = true;
                }
                cpu.insert(key, ticks);
            }
        }
        let cores = std::thread::available_parallelism()
            .map(|v| v.get() as f64)
            .unwrap_or(1.0);
        let percent = self.previous.filter(|_| known).and_then(|last| {
            let seconds = now.duration_since(last).as_secs_f64();
            (seconds > 0.01)
                .then(|| (delta as f64 / 10_000_000.0 / seconds / cores * 100.0).clamp(0.0, 100.0))
        });
        self.cpu = cpu;
        self.previous = Some(now);
        if background {
            if let Some(value) = percent {
                self.idle_samples.push_back(value);
                if self.idle_samples.len() > 30 {
                    self.idle_samples.pop_front();
                }
            }
        }
        let idle = if self.idle_samples.is_empty() {
            None
        } else {
            Some(self.idle_samples.iter().sum::<f64>() / self.idle_samples.len() as f64)
        };
        Ok(PerformanceSample {
            elapsed_ms: self.started.elapsed().as_millis() as u64,
            working_set_bytes: working_set,
            private_bytes: private,
            cpu_percent: percent,
            idle_cpu_estimate: idle,
            process_count: included.len(),
            webview_process_count: webviews,
            measured_processes: measured,
            memory_load_percent: memory_load(),
            startup_ms: startup,
            renderer,
        })
    }
}

#[cfg(windows)]
fn read_processes() -> Result<Vec<ProcessReading>, String> {
    use windows::Win32::{
        Foundation::{CloseHandle, FILETIME},
        System::{
            Diagnostics::ToolHelp::{
                CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
                TH32CS_SNAPPROCESS,
            },
            ProcessStatus::{
                GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS, PROCESS_MEMORY_COUNTERS_EX,
            },
            Threading::{GetProcessTimes, OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
        },
    };
    // Handles are closed on every path. Only PID, parent, executable basename and counters are read.
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
            .map_err(|_| "Process counters unavailable.")?;
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut rows = vec![];
        let mut next = Process32FirstW(snapshot, &mut entry).is_ok();
        while next {
            let len = entry
                .szExeFile
                .iter()
                .position(|c| *c == 0)
                .unwrap_or(entry.szExeFile.len());
            let webview = String::from_utf16_lossy(&entry.szExeFile[..len])
                .eq_ignore_ascii_case("msedgewebview2.exe");
            rows.push(ProcessReading {
                pid: entry.th32ProcessID,
                parent: entry.th32ParentProcessID,
                webview,
                working_set: 0,
                private: 0,
                cpu_ticks: None,
                created: 0,
            });
            next = Process32NextW(snapshot, &mut entry).is_ok();
        }
        let _ = CloseHandle(snapshot);
        let selected = descendants(&rows, std::process::id());
        for row in rows.iter_mut().filter(|r| selected.contains(&r.pid)) {
            if let Ok(handle) =
                OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, row.pid)
            {
                let mut counters = PROCESS_MEMORY_COUNTERS_EX::default();
                if GetProcessMemoryInfo(
                    handle,
                    &mut counters as *mut _ as *mut PROCESS_MEMORY_COUNTERS,
                    std::mem::size_of::<PROCESS_MEMORY_COUNTERS_EX>() as u32,
                )
                .is_ok()
                {
                    row.working_set = counters.WorkingSetSize as u64;
                    row.private = counters.PrivateUsage as u64;
                }
                let mut created = FILETIME::default();
                let mut exited = FILETIME::default();
                let mut kernel = FILETIME::default();
                let mut user = FILETIME::default();
                if GetProcessTimes(handle, &mut created, &mut exited, &mut kernel, &mut user)
                    .is_ok()
                {
                    let ticks =
                        |t: FILETIME| ((t.dwHighDateTime as u64) << 32) | t.dwLowDateTime as u64;
                    row.cpu_ticks = Some(ticks(kernel) + ticks(user));
                    row.created = ticks(created);
                }
                let _ = CloseHandle(handle);
            }
        }
        Ok(rows)
    }
}

#[cfg(windows)]
fn memory_load() -> u32 {
    use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    let mut status = MEMORYSTATUSEX {
        dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
        ..Default::default()
    };
    unsafe {
        let _ = GlobalMemoryStatusEx(&mut status);
    }
    status.dwMemoryLoad
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn includes_webview_descendants_but_not_other_applications() {
        let row = |pid, parent, webview| ProcessReading {
            pid,
            parent,
            webview,
            working_set: 0,
            private: 0,
            cpu_ticks: None,
            created: 0,
        };
        let rows = vec![
            row(3, 2, true),
            row(2, 1, true),
            row(4, 1, false),
            row(6, 7, true),
        ];
        assert_eq!(descendants(&rows, 1), HashSet::from([1, 2, 3]));
    }
    #[test]
    fn collects_actual_process_memory_and_defers_first_cpu_sample() {
        let sample = PerformanceMonitor::default()
            .sample(None, None, false)
            .unwrap();
        assert!(sample.working_set_bytes > 0);
        assert!(sample.private_bytes > 0);
        assert!(sample.cpu_percent.is_none());
        assert!(sample.process_count >= 1);
        assert!(sample.renderer.is_none());
    }
}
