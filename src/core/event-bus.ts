/**
 * Lightweight Event Bus (pub/sub) to decouple feature modules.
 * Replaces static ArcaFeed.runEvent() calls with injected dependencies.
 */

type EventHandler = (...args: any[]) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  async emit(event: string, ...args: any[]): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const promises = Array.from(handlers).map((handler) =>
      Promise.resolve(handler(...args)).catch((err) => {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }),
    );

    await Promise.all(promises);
  }

  off(event: string, handler?: EventHandler): void {
    if (handler) {
      this.handlers.get(event)?.delete(handler);
    } else {
      this.handlers.delete(event);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
