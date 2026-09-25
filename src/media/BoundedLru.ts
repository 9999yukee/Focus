/** An explicit byte budget, with disposal on replacement and eviction. */
export class BoundedLru<K, V> {
  private entries = new Map<K, { value: V; bytes: number }>();
  private used = 0;
  constructor(readonly budget: number, private readonly dispose: (value: V) => void = () => {}) {
    if (!Number.isFinite(budget) || budget < 0) throw new Error('Invalid cache budget');
  }
  get size(): number { return this.entries.size; }
  get bytes(): number { return this.used; }
  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key); this.entries.set(key, entry);
    return entry.value;
  }
  set(key: K, value: V, bytes: number): boolean {
    if (!Number.isFinite(bytes) || bytes < 0) throw new Error('Invalid entry size');
    bytes = Math.max(1, Math.ceil(bytes));
    this.delete(key);
    if (bytes > this.budget || this.budget === 0) { this.dispose(value); return false; }
    while (this.used + bytes > this.budget && this.entries.size) this.delete(this.entries.keys().next().value as K);
    this.entries.set(key, { value, bytes }); this.used += bytes;
    return true;
  }
  delete(key: K): void {
    const entry = this.entries.get(key);
    if (entry) { this.entries.delete(key); this.used -= entry.bytes; this.dispose(entry.value); }
  }
  clear(): void { for (const key of this.entries.keys()) this.delete(key); }
}
