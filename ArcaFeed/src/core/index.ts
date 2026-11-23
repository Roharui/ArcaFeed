import { wireFeedEventBus } from '@feed/core/core/app';
import { EventBus } from '@feed/core/core/event-bus';
import { EventQueue } from '@feed/core/core/event-queue';
import type { CommandResult } from '@feed/core/core/result';
import { reportFailure } from '@/utils/operation-error';
import { EventManager } from './event';
import { APP_EVENTS, eventBus } from './app-events';
import type { AppEvent } from './app-events';
import { VaultAdapter } from '@/vault';
import type { Step } from './step-runner';

class ArcaFeed {
  private static instance: ArcaFeed;
  private events!: EventManager;
  private vault!: VaultAdapter;
  private queue = new EventQueue();

  constructor() {
    if (ArcaFeed.instance) {
      console.warn(
        '[ArcaFeed] Instance already exists, skipping duplicate construction.',
      );
      return ArcaFeed.instance;
    }

    this.vault = new VaultAdapter();

    if (this.vault.href.mode === 'OTHER') {
      ArcaFeed.instance = this;
      console.log('[ArcaFeed] Unsupported page, exiting.');
      return;
    }

    this.events = new EventManager();
    wireFeedEventBus({
      appName: 'ArcaFeed',
      events: APP_EVENTS,
      eventBus,
      queue: this.queue,
      vault: this.vault,
      manager: this.events,
      reportFailure,
    });
    ArcaFeed.instance = this;
  }

  /**
   * @deprecated Use eventBus.emit() directly.
   */
  static async runEvent(eventName: AppEvent): Promise<CommandResult> {
    return eventBus.emit(eventName);
  }
}

export { ArcaFeed, EventBus, eventBus };
export type { Step };
