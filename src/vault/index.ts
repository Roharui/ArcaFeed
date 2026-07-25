export { StorageRepository } from './repository';
export { ConfigService } from './config';

/**
 * Vault adapter - provides a drop-in compatible interface
 * for gradual migration. Wraps Store + ConfigService.
 */
import { Store } from './store';
import { StorageRepository } from './repository';
import { ConfigService } from './config';

import type { AppState } from './store';
import type {
  HomeSeriesState,
  HrefImpl,
  SeriesSource,
  UISettings,
} from '@/types';
import type { Swiper } from 'swiper/types';

import { parseHref } from '@/utils/regex';

/**
 * Compatibility layer that mimics the old Vault interface
 * while delegating to Store and ConfigService internally.
 *
 * - Auto-persists state changes to localStorage via Store subscription.
 * - Can be constructed with no args (creates its own Store/ConfigService)
 *   or with explicit dependencies for testing.
 */
export class VaultAdapter {
  private store: Store;
  private config: ConfigService;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeAutoSave: (() => void) | null = null;

  // Swiper is UI state, kept direct
  swiper: Swiper | null = null;

  constructor(store?: Store, config?: ConfigService, initialHref?: HrefImpl) {
    this.config = config ?? new ConfigService(new StorageRepository());
    this.store = store ?? new Store(this.config.loadConfig());

    // Pre-set href from constructor injection (avoids redundant URL re-parse).
    // Falls back to synchronous URL parse if not provided.
    if (initialHref) {
      this.store.setState({ href: initialHref });
    } else {
      this.store.setState({ href: parseHref(window.location.href) });
    }

    // Auto-persist state changes with debounce
    this.unsubscribeAutoSave = this.store.subscribe((state) => {
      this.scheduleSave(state);
    });
  }

  /**
   * Debounced auto-save: batches rapid state changes into a single localStorage write.
   */
  private scheduleSave(state: AppState): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.persist(state);
      this.saveDebounceTimer = null;
    }, 300);
  }

  /**
   * Force immediate save (used before navigation away, etc.).
   */
  flushSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.persist(this.store.getState());
  }

  private persist(state: Readonly<AppState>): void {
    this.config.saveConfig(state);
    this.config.saveLastActiveIndex(state.articleKey, state.activeIndex);
  }

  /**
   * Clean up subscriptions. Call before destroying.
   */
  destroy(): void {
    this.unsubscribeAutoSave?.();
    this.flushSave();
  }

  // State delegation

  get href(): HrefImpl {
    return this.store.getState().href;
  }
  set href(v: HrefImpl) {
    this.store.setState({ href: { ...v } });
  }

  get activeIndex(): number {
    return this.store.getState().activeIndex;
  }
  set activeIndex(v: number) {
    this.store.setState({ activeIndex: v });
  }

  get articleKey(): string {
    return this.store.getState().articleKey;
  }
  set articleKey(v: string) {
    this.store.setState({
      articleKey: v,
      href: { ...this.href, articleKey: v },
    });
  }

  get articleList(): string[] {
    return this.store.getState().articleList;
  }
  set articleList(v: string[]) {
    this.store.setState({ articleList: [...new Set(v)] });
  }

  get articleFilterConfig() {
    return this.store.getState().articleFilterConfig;
  }
  set articleFilterConfig(v) {
    this.store.setState({ articleFilterConfig: v });
  }

  get isSeriesMode(): boolean {
    return this.seriesSource !== 'none';
  }

  get seriesSource(): SeriesSource {
    return this.store.getState().seriesSource;
  }
  set seriesSource(v: SeriesSource) {
    this.store.setState({ seriesSource: v });
  }

  get homeSeriesState(): HomeSeriesState {
    return this.store.getState().homeSeriesState;
  }
  set homeSeriesState(v: HomeSeriesState) {
    this.store.setState({
      homeSeriesState: {
        channels: [...new Set(v.channels)],
        cursors: { ...v.cursors },
        exhaustedChannels: [...new Set(v.exhaustedChannels)],
      },
    });
  }

  get searchQuery(): string {
    return this.store.getState().searchQuery;
  }
  set searchQuery(v: string) {
    this.store.setState({ searchQuery: v });
  }

  get lastActiveIndex(): number {
    return this.store.getState().lastActiveIndex;
  }
  set lastActiveIndex(v: number) {
    this.store.setState({ lastActiveIndex: v });
  }

  get uiSettings(): UISettings {
    return this.store.getState().uiSettings;
  }
  set uiSettings(v: UISettings) {
    this.store.setState({ uiSettings: v });
  }

  isCurrentMode(...mode: HrefImpl['mode'][]): boolean {
    return mode.includes(this.href.mode);
  }

  isNextPageActive(): boolean {
    return this.activeIndex < this.articleList.length - 1;
  }

  isPrevPageActive(): boolean {
    return this.activeIndex > 0;
  }

  resetArticleList(): void {
    this.store.setState({ articleList: [], activeIndex: -1 });
  }

  appendArticleLinks(links: Iterable<string>): number {
    const current = this.articleList;
    const next = [...new Set([...current, ...links])];
    if (next.length === current.length) return 0;
    this.articleList = next;
    return next.length - current.length;
  }

  /**
   * Copy series storage (delegates to ConfigService).
   */
  copySeriesStorage(
    sourceArticleKey: string,
    targetArticleKey: string,
    articleList: string[],
    activeIndex: number,
    searchQuery: string,
  ): void {
    this.config.copySeriesStorage(
      sourceArticleKey,
      targetArticleKey,
      articleList,
      activeIndex,
      searchQuery,
    );
  }
}
