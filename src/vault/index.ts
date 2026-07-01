export { StorageRepository } from './repository';
export { ConfigService } from './config';

/**
 * Vault adapter - provides a drop-in compatible interface
 * for gradual migration. Wraps Store + ConfigService.
 */
import { Store } from './store';
import { StorageRepository } from './repository';
import { ConfigService } from './config';

import type { AppState, StateSubscriber } from './store';
import type { HrefImpl } from '@/types';
import type { Swiper } from '@swiper/types';

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

  constructor(store?: Store, config?: ConfigService) {
    const repo = new StorageRepository();
    this.config = config ?? new ConfigService(repo);
    this.store = store ?? new Store(this.config.loadConfig());

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
      this.config.saveConfig(state);
      this.config.saveLastActiveIndex(state.articleKey, state.activeIndex);
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
    this.config.saveConfig(this.store.getState());
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
    this.store.setState({ href: v });
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
    this.store.setState({ articleKey: v });
  }

  get articleList(): string[] {
    return this.store.getState().articleList;
  }
  set articleList(v: string[]) {
    this.store.setState({ articleList: v });
  }

  get articleFilterConfig() {
    return this.store.getState().articleFilterConfig;
  }
  set articleFilterConfig(v) {
    this.store.setState({ articleFilterConfig: v });
  }

  get isSeriesMode(): boolean {
    return this.store.getState().isSeriesMode;
  }
  set isSeriesMode(v: boolean) {
    this.store.setState({ isSeriesMode: v });
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

  // State snapshot

  getState(): Readonly<AppState> {
    return this.store.getState();
  }

  // Store subscription (for reactive features)

  subscribe(subscriber: StateSubscriber): () => void {
    return this.store.subscribe(subscriber);
  }

  // Compatibility methods

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
    this.store.setState({ articleList: [] });
  }

  /**
   * @deprecated State is now auto-persisted via Store subscription.
   * Kept for backward compatibility.
   */
  saveConfig(): void {
    this.flushSave();
  }

  saveLastActiveIndex(): void {
    this.config.saveLastActiveIndex(this.articleKey, this.activeIndex);
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
