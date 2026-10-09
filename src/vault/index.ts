export { StorageRepository } from './repository';
export { ConfigService } from './config';

/**
 * Vault adapter - provides a drop-in compatible interface
 * for gradual migration. Wraps Store + ConfigService.
 */
import { Store } from './store';
import { StorageRepository } from './repository';
import { ConfigService } from './config';
import { ReadingHistory } from './reading-history';
import { readingPreferenceKey } from './reading-context';
import type { ReadingSession } from './reading-history';
import type { PageMode } from '@/types';

import type { Swiper } from 'swiper/types';

import type { AppState, StateSubscriber } from './store';
import type { HrefImpl, UISettings } from '@/types';

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
  private loadRevision = 0;

  // Swiper is UI state, kept direct
  swiper: Swiper | null = null;
  readonly reading: ReadingHistory;

  constructor(store?: Store, config?: ConfigService, initialHref?: HrefImpl) {
    this.config = config ?? new ConfigService(new StorageRepository());
    this.store = store ?? new Store(this.config.loadConfig());
    this.reading = new ReadingHistory();
    this.reading.subscribe(() => {
      this.store.setState({
        readingRevision: this.store.getState().readingRevision + 1,
      });
    });

    // Pre-set href from constructor injection (avoids redundant URL re-parse).
    // Falls back to synchronous URL parse if not provided.
    if (initialHref) {
      this.store.setState({ href: initialHref });
    } else {
      this.store.setState({ href: parseHref(window.location.href) });
    }

    // Auto-persist state changes with debounce
    this.unsubscribeAutoSave = this.store.subscribe(() => {
      this.scheduleSave();
    });
  }

  /**
   * Debounced auto-save: batches rapid state changes into a single localStorage write.
   */
  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.config.saveConfig(this.store.getState());
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
    this.loadRevision++;
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

  get seriesChannels(): string[] {
    return this.store.getState().seriesChannels;
  }

  get isScrapMode(): boolean {
    return this.store.getState().isScrapMode;
  }

  get skipVisitedArticles(): boolean {
    return (
      this.uiSettings.skipVisitedContexts[readingPreferenceKey(this)] === true
    );
  }
  set skipVisitedArticles(enabled: boolean) {
    this.uiSettings = {
      ...this.uiSettings,
      skipVisitedContexts: {
        ...this.uiSettings.skipVisitedContexts,
        [readingPreferenceKey(this)]: enabled,
      },
    };
  }

  get isShuffleMode(): boolean {
    return this.store.getState().isShuffleMode;
  }
  set isShuffleMode(v: boolean) {
    this.store.setState({ isShuffleMode: v });
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

  // State snapshot

  getState(): Readonly<AppState> {
    return this.store.getState();
  }

  /** Commit related state changes together so subscribers see a complete session. */
  updateState(patch: Partial<AppState>): void {
    this.store.setState(patch);
  }

  get articleLoadRevision(): number {
    return this.loadRevision;
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
    return this.getAdjacentArticleIndex('NEXT') !== -1;
  }

  isPrevPageActive(): boolean {
    return this.getAdjacentArticleIndex('PREV') !== -1;
  }

  getAdjacentArticleIndex(mode: PageMode): number {
    const direction = mode === 'NEXT' ? 1 : -1;
    for (
      let index = this.activeIndex + direction;
      index >= 0 && index < this.articleList.length;
      index += direction
    ) {
      const path = this.articleList[index]!;
      if (
        mode === 'NEXT' &&
        this.isCurrentMode('ARTICLE') &&
        path === `/b/${this.href.channelId}/${this.href.articleId}`
      )
        continue;
      // Backwards navigation remains available to revisit the previous article.
      if (
        mode === 'NEXT' &&
        this.skipVisitedArticles &&
        this.reading.hasVisited(path)
      )
        continue;
      return index;
    }
    return -1;
  }

  restoreReadingSession(session: ReadingSession, articleKey: string): void {
    this.loadRevision++;
    this.flushSave();
    this.config.restoreReadingSession(session, articleKey);
  }

  resetArticleList(): void {
    this.loadRevision++;
    this.store.setState({ articleList: [], activeIndex: -1 });
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
