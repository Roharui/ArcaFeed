import type { EventBus } from './event-bus';
import type { EventQueue } from './event-queue';
import type { FlushableVault, Step } from './step-runner';

export interface WireFeedEventBusOptions<
  TEvent extends string,
  TVault extends FlushableVault,
> {
  appName: string;
  events: readonly TEvent[];
  eventBus: EventBus<Record<TEvent, []>>;
  queue: EventQueue;
  vault: TVault;
  manager: {
    runner: { run(vault: TVault, steps: Step<TVault>[]): Promise<void> };
  } & Record<TEvent, () => Step<TVault>[]>;
  reportFailure: (error: unknown) => unknown;
}

/**
 * Wire EventBus events to EventManager methods via an EventQueue.
 */
export function wireFeedEventBus<
  TEvent extends string,
  TVault extends FlushableVault,
>({
  appName,
  events,
  eventBus,
  queue,
  vault,
  manager,
  reportFailure,
}: WireFeedEventBusOptions<TEvent, TVault>): void {
  for (const eventName of events) {
    eventBus.on(eventName, () =>
      queue.run(async () => {
        try {
          await manager.runner.run(vault, manager[eventName]());
        } catch (err) {
          console.error(
            `[${appName}] Error running event "${eventName}":`,
            err,
          );
          throw reportFailure(err);
        }
      }, eventName),
    );
  }
}
