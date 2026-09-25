import { describe, expect, it } from 'vitest';
import { BoundedLru } from '../src/media/BoundedLru';

describe('bounded cache', () => {
  it('evicts the least recently used entry and releases resources exactly once', () => {
    const released: string[] = [];
    const cache = new BoundedLru<string, string>(10, value => released.push(value));
    cache.set('a', 'A', 4); cache.set('b', 'B', 4); cache.get('a'); cache.set('c', 'C', 4);
    expect(cache.get('b')).toBeUndefined(); expect(cache.bytes).toBe(8); expect(released).toEqual(['B']);
    cache.set('a', 'A2', 3); expect(cache.bytes).toBe(7);
    cache.clear(); expect(released).toEqual(['B', 'A', 'C', 'A2']); expect(cache.bytes).toBe(0);
  });
  it('rejects oversized data and bounds even nominally zero-cost entries', () => {
    const cache = new BoundedLru<number, number>(5);
    expect(cache.set(1, 1, 6)).toBe(false);
    for (let i = 0; i < 100; i++) cache.set(i, i, 0);
    expect(cache.size).toBe(5); expect(cache.bytes).toBe(5);
    expect(() => cache.set(1, 1, NaN)).toThrow();
  });
});
