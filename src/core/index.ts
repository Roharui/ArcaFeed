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
    const stepGetters: Record<string, () => Step[]> = {
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
      checkPluginModal: () => this.events.checkPluginModal(),
      closeModal: () => this.events.closeModal(),
      toggleSwiper: () => this.events.toggleSwiper(),
    };

    for (const [eventName, getSteps] of Object.entries(stepGetters)) {
      eventBus.on(eventName, async () => {
        const steps = getSteps();

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
