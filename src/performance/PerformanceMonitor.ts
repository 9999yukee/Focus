import { invoke } from '@tauri-apps/api/core';
import { native } from '../stores/settings';
import { toast } from '../components/dom';
import type { FrameMetrics } from './FrameSampler';

export interface RendererMetrics extends FrameMetrics {
  domNodes: number; messagesRendered: number; imagesLoaded: number; videoPlaying: number; observedAtMs: number;
}
export interface PerformanceSample {
  elapsedMs: number; workingSetBytes: number; privateBytes: number; cpuPercent: number | null;
  idleCpuEstimate: number | null; processCount: number; webviewProcessCount: number; measuredProcesses: number;
  memoryLoadPercent: number; startupMs: number | null; renderer: RendererMetrics | null;
}
export class PerformanceMonitor {
  enabled = false;
  sample: PerformanceSample | null = null;
  samples: PerformanceSample[] = [];
  recording = false;
  scenario = 'login-idle';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopTime = 0;
  private listeners = new Set<() => void>();
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private notify(): void { for (const listener of this.listeners) listener(); }
  async toggle(enabled: boolean): Promise<void> {
    if (!native) { toast('Live process measurements are available in the Windows app.'); return; }
    await invoke('set_monitor', { enabled });
    this.enabled = enabled;
    if (this.timer) clearTimeout(this.timer);
    if (enabled) void this.tick(); else { this.recording = false; this.sample = null; this.notify(); }
  }
  private tick = async (): Promise<void> => {
    if (!this.enabled) return;
    try {
      const sample = await invoke<PerformanceSample>('sample_performance');
      if (!this.enabled) return;
      this.sample = sample;
      if (this.recording) {
        this.samples.push(sample);
        if (Date.now() >= this.stopTime || this.samples.length >= 600) {
          this.recording = false;
          toast('Capture complete. Export the measurements from Performance.');
        }
      }
      this.notify();
    } catch (error) { toast(String(error)); }
    if (this.enabled) this.timer = setTimeout(this.tick, 2000);
  };
  async record(scenario: string): Promise<void> {
    if (!native) { toast('Benchmark capture requires the Windows app.'); return; }
    if (this.recording) return;
    this.scenario = scenario; this.samples = []; this.stopTime = Date.now() + 30_000; this.recording = true;
    if (!this.enabled) await this.toggle(true);
    this.notify();
  }
  async export(): Promise<void> {
    if (!this.samples.length) { toast('Capture a benchmark first.'); return; }
    const path = await invoke<string>('export_benchmark', { scenario: this.scenario, samples: this.samples });
    toast(`Measurements saved to ${path}`);
  }
}
export const performanceMonitor = new PerformanceMonitor();
export function memory(bytes: number | undefined): string { return bytes === undefined ? '—' : `${(bytes / 1048576).toFixed(1)} MB`; }
export function number(value: number | null | undefined, suffix = '', digits = 1): string { return value == null ? '—' : `${value.toFixed(digits)}${suffix}`; }
