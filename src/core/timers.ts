/**
 * Named timeouts. Setting a key replaces any timer already under it, so a key is never scheduled twice.
 * `dispose()` clears everything and ignores later `set` calls, so nothing fires after `destroy()`.
 */
export class Timers<Key extends string = string> {
  #timers = new Map<Key, ReturnType<typeof setTimeout>>();
  #disposed = false;

  set(key: Key, fn: () => void, ms: number): void {
    this.clear(key);
    if (this.#disposed) return;
    this.#timers.set(
      key,
      setTimeout(() => {
        this.#timers.delete(key);
        fn();
      }, ms),
    );
  }

  clear(key: Key): void {
    clearTimeout(this.#timers.get(key));
    this.#timers.delete(key);
  }

  has(key: Key): boolean {
    return this.#timers.has(key);
  }

  dispose(): void {
    this.#disposed = true;
    for (const timer of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
  }
}
