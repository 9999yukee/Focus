export type Temperature = 'HOT' | 'WARM' | 'COLD';
export interface ViewportRange { start: number; end: number; hotStart: number; hotEnd: number; offset: number; totalHeight: number; overscan: number }

/** Renderer-owned experiment. Never removes or recycles Discord's React nodes. */
export class AdaptiveViewportEngine {
  private heights: Float64Array;
  private tree: Float64Array;
  private previousY = 0;
  private previousTime: number | undefined;
  private velocity = 0;

  constructor(readonly count: number, readonly estimatedHeight = 52, readonly maxRows = 80) {
    if (!Number.isInteger(count) || count < 0 || !Number.isFinite(estimatedHeight) || estimatedHeight <= 0 || maxRows < 1) throw new Error('Invalid viewport dimensions');
    this.heights = new Float64Array(count).fill(estimatedHeight);
    this.tree = new Float64Array(count + 1);
    for (let index = 1; index <= count; index++) this.tree[index] = (index & -index) * estimatedHeight;
  }

  measure(index: number, height: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.count || !Number.isFinite(height) || height <= 0) return;
    const delta = height - this.heights[index];
    this.heights[index] = height;
    for (let i = index + 1; i <= this.count; i += i & -i) this.tree[i] += delta;
  }

  offset(index: number): number {
    let sum = 0;
    for (let i = Math.min(this.count, Math.max(0, Math.floor(index))); i > 0; i -= i & -i) sum += this.tree[i];
    return sum;
  }

  private indexAt(position: number): number {
    let index = 0, sum = 0;
    let bit = 1;
    while (bit * 2 <= this.count) bit *= 2;
    for (; bit > 0; bit >>= 1) {
      const next = index + bit;
      if (next <= this.count && sum + this.tree[next] <= position) { sum += this.tree[next]; index = next; }
    }
    return Math.min(index, Math.max(0, this.count - 1));
  }

  range(scrollY: number, viewportHeight: number, time: number): ViewportRange {
    const totalHeight = this.offset(this.count);
    const height = Math.max(0, Number.isFinite(viewportHeight) ? viewportHeight : 0);
    const y = Math.max(0, Math.min(Number.isFinite(scrollY) ? scrollY : 0, Math.max(0, totalHeight - height)));
    const elapsed = this.previousTime === undefined ? 0 : time - this.previousTime;
    if (elapsed > 0) this.velocity = Math.abs(y - this.previousY) / elapsed;
    this.previousTime = time; this.previousY = y;
    if (!this.count || height === 0) return { start: 0, end: 0, hotStart: 0, hotEnd: 0, offset: 0, totalHeight, overscan: 0 };
    const hotStart = this.indexAt(y);
    const hotEnd = Math.min(this.count, this.indexAt(Math.max(y, y + height - 0.01)) + 1);
    const requested = this.velocity > 2 ? 20 : this.velocity > 0.5 ? 12 : 8;
    const overscan = Math.max(0, Math.min(requested, Math.floor((this.maxRows - (hotEnd - hotStart)) / 2)));
    const start = Math.max(0, hotStart - overscan), end = Math.min(this.count, hotEnd + overscan);
    return { start, end, hotStart, hotEnd, offset: this.offset(start), totalHeight, overscan };
  }

  temperature(index: number, range: ViewportRange): Temperature {
    return index >= range.hotStart && index < range.hotEnd ? 'HOT' : index >= range.start && index < range.end ? 'WARM' : 'COLD';
  }
}

export interface FrozenView { channelId: string; scrollY: number; draft: string }
