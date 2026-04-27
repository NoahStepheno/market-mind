/**
 * In-memory async queue with a hard capacity (alarm-realtime-technical §6 背压).
 */
export class AsyncBoundedQueue<T> {
  private readonly buf: T[] = [];
  private readonly takers: Array<(item: T) => void> = [];
  private readonly blockedProducers: Array<() => void> = [];

  constructor(private readonly maxDepth: number) {}

  get depth(): number {
    return this.buf.length;
  }

  tryEnqueue(item: T): boolean {
    if (this.takers.length > 0) {
      this.takers.shift()!(item);
      this.wakeOneProducer();
      return true;
    }
    if (this.buf.length >= this.maxDepth) {
      return false;
    }
    this.buf.push(item);
    return true;
  }

  async enqueueWhenReady(item: T): Promise<void> {
    for (;;) {
      if (this.tryEnqueue(item)) {
        return;
      }
      await new Promise<void>((resolve) => this.blockedProducers.push(resolve));
    }
  }

  async dequeue(): Promise<T> {
    if (this.buf.length > 0) {
      const item = this.buf.shift()!;
      this.wakeOneProducer();
      return item;
    }
    return new Promise<T>((resolve) => this.takers.push(resolve));
  }

  private wakeOneProducer() {
    const wake = this.blockedProducers.shift();
    if (wake) {
      wake();
    }
  }
}
