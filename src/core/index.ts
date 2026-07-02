import { EventManager } from './event';
import { EventBus } from './event-bus';
import { VaultAdapter } from '@/vault';

/**
 * Central Event Bus instance - decouples feature modules from ArcaFeed.
 */
const eventBus = new EventBus();

class ArcaFeed {
  private static instance: ArcaFeed;
  private events!: EventManager;
  private vault!: VaultAdapter;
  private isRunning = false;

  constructor() {
    // Prevent duplicate instantiation: if an instance already exists,
    // skip re-registering EventBus handlers to avoid double execution.
    if (ArcaFeed.instance) {
      console.warn(
        '[ArcaFeed] Instance already exists, skipping duplicate construction.',
      );
      return;
    }

    ArcaFeed.instance = this;
    this.vault = new VaultAdapter();
    this.events = new EventManager();
    this.wireEventBus();
  }

  /**
   * Wire EventBus events to EventManager methods.
   * Each event maps to a method that returns Step[], which StepRunner executes.
   */
  private wireEventBus(): void {
    const eventNames = [
      'init',
      'toNextPage',
      'toPrevPage',
      'toNextLinkForce',
      'renderNextPage',
      'renderPrevPage',
      'enableSeries',
      'enableScrapSeries',
      'showModal',
      'checkFilterModal',
      'checkUIModal',
      'closeModal',
      'toggleSwiper',
    ] as const;

    for (const eventName of eventNames) {
      eventBus.on(eventName as string, async () => {
        const method = (this.events as any)[eventName] as () => Step[];
        const steps = method.call(this.events);

        if (this.isRunning) return;
        this.isRunning = true;

        try {
          await this.events.runner.run(this.vault, steps);
        } catch (err) {
          console.error(`[ArcaFeed] Error running event "${eventName}":`, err);
        } finally {
          this.isRunning = false;
        }
      });
    }
  }

  /**
   * @deprecated Use eventBus.emit() directly.
   */
  static async runEvent(eventName: string) {
    eventBus.emit(eventName);
  }
}

export { ArcaFeed, EventBus, eventBus };

// Re-export Step type
import type { Step } from './step-runner';
export type { Step };
