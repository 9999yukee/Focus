import { describe, expect, it } from 'vitest';
import { AdaptiveViewportEngine } from '../src/virtualization/AdaptiveViewportEngine';

describe('AdaptiveViewportEngine', () => {
  it('mounts a bounded range out of 30,000 rows while keeping the viewport complete', () => {
    const engine = new AdaptiveViewportEngine(30_000, 52);
    const range = engine.range(15_000 * 52, 600, 0);
    expect(range.hotStart).toBe(15000);
    expect(range.hotEnd).toBe(15012);
    expect(range.end - range.start).toBeLessThanOrEqual(80);
    expect(engine.temperature(0, range)).toBe('COLD');
    expect(engine.temperature(15000, range)).toBe('HOT');
    expect(engine.temperature(14999, range)).toBe('WARM');
  });
  it('expands during fast scrolling and shrinks after settling', () => {
    const engine = new AdaptiveViewportEngine(1000, 50);
    expect(engine.range(5000, 600, 1).overscan).toBe(8);
    const fast = engine.range(10000, 600, 17);
    expect(fast.overscan).toBe(20);
    expect(engine.range(10000, 600, 200).overscan).toBe(8);
  });
  it('matches variable-height geometry over many scroll positions', () => {
    const engine = new AdaptiveViewportEngine(500, 50);
    const heights = Array.from({ length: 500 }, (_, index) => 20 + (index * 37) % 140);
    heights.forEach((height, index) => engine.measure(index, height));
    const positions = [0]; heights.forEach(height => positions.push(positions.at(-1)! + height));
    for (let y = 0; y < positions.at(-1)! - 800; y += 271) {
      const range = engine.range(y, 800, y);
      const start = positions.findIndex((offset, index) => offset <= y && positions[index + 1] > y);
      expect(range.hotStart).toBe(start);
      expect(engine.offset(range.hotEnd)).toBeGreaterThanOrEqual(y + 800);
      expect(range.offset).toBe(positions[range.start]);
    }
  });
  it('handles empty lists, overscroll, resizing, and huge visible regions', () => {
    expect(new AdaptiveViewportEngine(0).range(500, 600, 0).end).toBe(0);
    const engine = new AdaptiveViewportEngine(200, 10);
    expect(engine.range(-200, 100, 0).hotStart).toBe(0);
    expect(engine.range(Infinity, 0, 10).end).toBe(0);
    const last = engine.range(100_000, 500, 20);
    expect(last.end).toBe(200); expect(last.hotStart).toBe(150);
    const huge = engine.range(0, 1500, 30);
    expect(huge.hotEnd).toBe(150); expect(huge.overscan).toBe(0);
  });
});
