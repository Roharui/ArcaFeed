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

class RuliFeed {
  private static instance: RuliFeed;
  private events!: EventManager;
  private vault!: VaultAdapter;
  private queue = new EventQueue();

  constructor() {
    if (RuliFeed.instance) {
      console.warn(
        '[RuliFeed] Instance already exists, skipping duplicate construction.',
      );
      return RuliFeed.instance;
    }

    this.vault = new VaultAdapter();

    if (this.vault.href.mode === 'OTHER') {
      RuliFeed.instance = this;
      console.log('[RuliFeed] Unsupported page, exiting.');
      return;
    }

    this.events = new EventManager();
    wireFeedEventBus({
      appName: 'RuliFeed',
      events: APP_EVENTS,
      eventBus,
      queue: this.queue,
      vault: this.vault,
      manager: this.events,
      reportFailure,
    });
    RuliFeed.instance = this;
  }

  /**
   * @deprecated Use eventBus.emit() directly.
   */
  static async runEvent(eventName: AppEvent): Promise<CommandResult> {
    return eventBus.emit(eventName);
  }
}

export { RuliFeed, EventBus, eventBus };
export type { Step };
