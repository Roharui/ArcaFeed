import { EventManager } from './event';
import { EventBus } from './event-bus';
import { APP_EVENT_NAMES } from './events';
import { VaultAdapter } from '@/vault';

import type { AppEventName } from './events';
/**
 * Central Event Bus instance - decouples feature modules from ArcaFeed.
 */
const eventBus = new EventBus<AppEventName>();

class ArcaFeed {
  private static instance: ArcaFeed;
  private events!: EventManager;
  private vault!: VaultAdapter;
  private eventQueue: Promise<void> = Promise.resolve();

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

    // ── Page mode detection ─────────────────────────
    // Create VaultAdapter first — its constructor runs ConfigService which may
    // call ensureArticleKey() and modify window.location via history.replaceState.
    // The VaultAdapter internally calls parseHref() after this, so href is correct.
    this.vault = new VaultAdapter();

    const { mode } = this.vault.href;

    // ArcaFeed only operates on HOME / ARTICLE / CHANNEL / SCRAP pages.
    // On OTHER pages, exit early without loading CSS or wiring events.
    if (mode === 'OTHER') {
      console.log('[ArcaFeed] Unsupported page, exiting.');
      return;
    }

    // Load global layout CSS only on supported pages.
    // Feature-specific CSS (swiper, modal, series, etc.) is loaded via their
    // respective module imports and only affects ArcaFeed-created elements.
    import(/* webpackMode: "eager" */ '@css/arcalive.css');

    this.events = new EventManager();
    this.wireEventBus();
  }

  /**
   * Wire EventBus events to EventManager methods.
   * Each event maps to a method that returns Step[], which StepRunner executes.
   */
  private wireEventBus(): void {
    const stepGetters: Record<AppEventName, () => Step[]> = {
      init: () => this.events.init(),
      toNextPage: () => this.events.toNextPage(),
      toPrevPage: () => this.events.toPrevPage(),
      toNextLinkForce: () => this.events.toNextLinkForce(),
      renderNextPage: () => this.events.renderNextPage(),
      renderPrevPage: () => this.events.renderPrevPage(),
      enableSeries: () => this.events.enableSeries(),
      enableScrapSeries: () => this.events.enableScrapSeries(),
      showModal: () => this.events.showModal(),
      checkFilterModal: () => this.events.checkFilterModal(),
      checkUIModal: () => this.events.checkUIModal(),
      checkSubscribeModal: () => this.events.checkSubscribeModal(),
      closeModal: () => this.events.closeModal(),
      toggleSwiper: () => this.events.toggleSwiper(),
    };

    for (const eventName of APP_EVENT_NAMES) {
      eventBus.on(eventName, () =>
        this.enqueueEvent(eventName, stepGetters[eventName]),
      );
    }
  }

  /**
   * Serialize events instead of dropping input received while another event is
   * running. Keeping the queue alive after failures also prevents a single
   * rejected task from disabling every later interaction.
   */
  private enqueueEvent(
    eventName: AppEventName,
    getSteps: () => Step[],
  ): Promise<void> {
    const run = async () => {
      try {
        await this.events.runner.run(this.vault, getSteps());
      } catch (err) {
        console.error(`[ArcaFeed] Error running event "${eventName}":`, err);
      }
    };

    this.eventQueue = this.eventQueue.then(run, run);
    return this.eventQueue;
  }
}

export { ArcaFeed, EventBus, eventBus };
export type { AppEventName } from './events';

// Re-export Step type
import type { Step } from './step-runner';
export type { Step };
