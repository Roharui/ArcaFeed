/**
 * Lightweight Event Bus (pub/sub) to decouple feature modules.
 * Replaces static ArcaFeed.runEvent() calls with injected dependencies.
 */

import type { CommandResult } from './result';

type EventHandler<Args extends unknown[]> = (
  ...args: Args
) => void | CommandResult | Promise<void | CommandResult>;

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
  ): Promise<CommandResult> {
    const handlers = this.handlers[event];
    if (!handlers?.size)
      return {
        ok: false,
        errors: [new Error(`No handler for ${String(event)}`)],
      };

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        const result = await handler(...args);
        return result && !result.ok
          ? result.errors.length
            ? [...result.errors]
            : [new Error('Command failed without details')]
          : [];
      } catch (err) {
        console.error(
          `[EventBus] Error in handler for "${String(event)}":`,
          err,
        );
        return [err];
      }
    });

    const errors = (await Promise.all(promises)).flat();
    return errors.length ? { ok: false, errors } : { ok: true };
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
