import { EventManager } from './event';
import { EventBus } from './event-bus';
import { eventBus } from './app-events';
import { EventQueue } from './event-queue';
import type { AppEvent } from './app-events';
import { VaultAdapter } from '@/vault';

class ArcaFeed {
  private static instance: ArcaFeed;
  private events!: EventManager;
  private vault!: VaultAdapter;
  private queue = new EventQueue();

  constructor() {
    // Prevent duplicate instantiation: if an instance already exists,
    // skip re-registering EventBus handlers to avoid double execution.
    if (ArcaFeed.instance) {
      console.warn(
        '[ArcaFeed] Instance already exists, skipping duplicate construction.',
      );
      return ArcaFeed.instance;
    }

    // ── Page mode detection ─────────────────────────
    // Create VaultAdapter first — its constructor runs ConfigService which may
    // call ensureArticleKey() and modify window.location via history.replaceState.
    // The VaultAdapter internally calls parseHref() after this, so href is correct.
    this.vault = new VaultAdapter();

    const { mode } = this.vault.href;

    // ArcaFeed only operates on HOME / ARTICLE / CHANNEL / SCRAP pages.
    // On OTHER pages, exit early without loading CSS or wiring events.
    if (mode === 'OTHER') {
      ArcaFeed.instance = this;
      console.log('[ArcaFeed] Unsupported page, exiting.');
      return;
    }

    // Load global layout CSS only on supported pages.
    // Feature-specific CSS (swiper, modal, series, etc.) is loaded via their
    // respective module imports and only affects ArcaFeed-created elements.
    import(/* webpackMode: "eager" */ '@css/arcalive.css');

    this.events = new EventManager();
    this.wireEventBus();
    ArcaFeed.instance = this;
  }

  /**
   * Wire EventBus events to EventManager methods.
   * Each event maps to a method that returns Step[], which StepRunner executes.
   */
  private wireEventBus(): void {
    const stepGetters: Record<AppEvent, () => Step[]> = {
      init: () => this.events.init(),
      toNextPage: () => this.events.toNextPage(),
      toPrevPage: () => this.events.toPrevPage(),
      toNextLinkForce: () => this.events.toNextLinkForce(),
      renderNextPage: () => this.events.renderNextPage(),
      renderPrevPage: () => this.events.renderPrevPage(),
      enableSeries: () => this.events.enableSeries(),
      enableScrapSeries: () => this.events.enableScrapSeries(),
      toggleShuffle: () => this.events.toggleShuffle(),
      showModal: () => this.events.showModal(),
      checkFilterModal: () => this.events.checkFilterModal(),
      checkUIModal: () => this.events.checkUIModal(),
      checkSubscribeModal: () => this.events.checkSubscribeModal(),
      closeModal: () => this.events.closeModal(),
      toggleSwiper: () => this.events.toggleSwiper(),
    };

    for (const eventName of Object.keys(stepGetters) as AppEvent[]) {
      eventBus.on(eventName, () =>
        this.queue.run(async () => {
          try {
            await this.events.runner.run(this.vault, stepGetters[eventName]());
          } catch (err) {
            console.error(
              `[ArcaFeed] Error running event "${eventName}":`,
              err,
            );
          }
        }, eventName),
      );
    }
  }

  /**
   * @deprecated Use eventBus.emit() directly.
   */
  static async runEvent(eventName: AppEvent): Promise<void> {
    await eventBus.emit(eventName);
  }
}

export { ArcaFeed, EventBus, eventBus };

// Re-export Step type
import type { Step } from './step-runner';
export type { Step };
