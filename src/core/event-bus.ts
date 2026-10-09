/**
 * Lightweight Event Bus (pub/sub) to decouple feature modules.
 * Replaces static ArcaFeed.runEvent() calls with injected dependencies.
 */

type EventHandler<Args extends unknown[]> = (
  ...args: Args
) => void | Promise<void>;

export class EventBus<
  Events extends { [K in keyof Events]: unknown[] } = Record<string, any[]>,
> {
  private handlers: {
    [K in keyof Events]?: Set<EventHandler<Events[K]>>;
  } = Object.create(null);

  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): () => void {
    const handlers = (this.handlers[event] ??= new Set());
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
    };
  }

  async emit<K extends keyof Events>(
    event: K,
    ...args: Events[K]
  ): Promise<void> {
    const handlers = this.handlers[event];
    if (!handlers) return;

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(...args);
      } catch (err) {
        console.error(
          `[EventBus] Error in handler for "${String(event)}":`,
          err,
        );
      }
    });

    await Promise.all(promises);
  }

  off<K extends keyof Events>(
    event: K,
    handler?: EventHandler<Events[K]>,
  ): void {
    if (handler) {
      this.handlers[event]?.delete(handler);
    } else {
      delete this.handlers[event];
    }
  }

  clear(): void {
    this.handlers = Object.create(null);
  }
}
