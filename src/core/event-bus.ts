type EventHandler = () => void | Promise<void>;

/**
 * Minimal typed pub/sub bus.
 *
 * ArcaFeed events do not carry payloads. Restricting the event name at the
 * type level prevents silent failures caused by misspelled string literals.
 */
export class EventBus<EventName extends string = string> {
  private handlers = new Map<EventName, Set<EventHandler>>();

  on(event: EventName, handler: EventHandler): () => void {
    const eventHandlers = this.handlers.get(event) ?? new Set<EventHandler>();
    eventHandlers.add(handler);
    this.handlers.set(event, eventHandlers);

    return () => {
      const handlers = this.handlers.get(event);
      handlers?.delete(handler);
      if (handlers?.size === 0) this.handlers.delete(event);
    };
  }

  async emit(event: EventName): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    await Promise.all([...handlers].map((handler) => handler()));
  }

  off(event: EventName, handler?: EventHandler): void {
    if (handler) {
      const handlers = this.handlers.get(event);
      handlers?.delete(handler);
      if (handlers?.size === 0) this.handlers.delete(event);
    } else {
      this.handlers.delete(event);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
