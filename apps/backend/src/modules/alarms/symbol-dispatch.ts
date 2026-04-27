/**
 * Ensures handlers for the same `symbol` never run concurrently (§4.1).
 */
export class PerSymbolSerialDispatcher {
  private readonly tails = new Map<string, Promise<void>>();

  run(symbol: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.tails.get(symbol) ?? Promise.resolve();
    const next = prev.then(fn).catch(() => {});
    this.tails.set(symbol, next);
    void next.finally(() => {
      if (this.tails.get(symbol) === next) {
        this.tails.delete(symbol);
      }
    });
    return next;
  }
}
