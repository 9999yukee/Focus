export interface FrameMetrics { fps: number | null; frameTimeMs: number | null; frameP95Ms: number | null; estimatedDroppedFrames: number; longTasks: number }

export class FrameSampler {
  private frame = 0;
  private previous = 0;
  private intervals: number[] = [];
  private longTasks = 0;
  private observer: PerformanceObserver | undefined;
  private active = false;
  start(): void {
    if (this.active) return;
    this.active = true; this.previous = 0; this.intervals = []; this.longTasks = 0;
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      this.observer = new PerformanceObserver((list) => { this.longTasks += list.getEntries().length; });
      this.observer.observe({ type: 'longtask' });
    }
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (time: number): void => {
    if (!this.active) return;
    if (this.previous && this.intervals.length < 600) this.intervals.push(time - this.previous);
    this.previous = time;
    this.frame = requestAnimationFrame(this.tick);
  };
  take(): FrameMetrics {
    const sorted = this.intervals.slice().sort((a, b) => a - b);
    const average = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null;
    const metrics = { fps: average ? 1000 / average : null, frameTimeMs: average, frameP95Ms: sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.95)] : null, estimatedDroppedFrames: sorted.reduce((sum, value) => sum + Math.max(0, Math.round(value / (1000 / 60)) - 1), 0), longTasks: this.longTasks };
    this.intervals = []; this.longTasks = 0;
    return metrics;
  }
  stop(): void { this.active = false; cancelAnimationFrame(this.frame); this.observer?.disconnect(); this.observer = undefined; this.previous = 0; this.intervals = []; }
}
