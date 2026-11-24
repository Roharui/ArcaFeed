import { deferField, mergeState, sameField } from '@feed/core/vault/lazy-state';
/**
 * Config Service - handles loading and saving application configuration.
 * Uses StorageRepository instead of directly accessing IndexedDB.
 */

import { StorageRepository } from './repository';
import { ConfigStorage } from './config-storage';
import { NavigationStorage } from './navigation-storage';
import { createArticleKey } from '@/utils/article-key';
import { compactNavigationArticles, findArticleIndex } from './article-window';

import type { AppState } from '@/vault/store';
import { createInitialState } from './store';
import type { ReadingSession } from './reading-history';

const CHANNEL_OR_ARTICLE_PAGE_REGEX = /^\/b\/[a-zA-Z0-9]+(\/\d+)?\/?$/;

export class ConfigService {
  private lastSavedState: Readonly<AppState> | undefined;

  private storage: ConfigStorage;
  private navigation: NavigationStorage;

  constructor(private repo: StorageRepository) {
    this.storage = new ConfigStorage(repo);
    this.navigation = new NavigationStorage(repo);
  }

  /**
   * Ensure the current page has an articleKey in its URL query params.
   */
  ensureArticleKey(): string {
    const currentUrl = new URL(window.location.href);
    const existingKey = currentUrl.searchParams.get('articleKey');

    if (existingKey) {
      return existingKey;
    }

    if (!CHANNEL_OR_ARTICLE_PAGE_REGEX.test(currentUrl.pathname)) {
      return '';
    }

    const generatedKey = createArticleKey();

    currentUrl.searchParams.set('articleKey', generatedKey);
    window.history.replaceState({}, '', currentUrl.toString());

    return generatedKey;
  }

  /**
   * Load saved config from IndexedDB and populate initial state.
   */
  loadConfig(): Partial<AppState> {
    const articleKey = this.ensureArticleKey();
    const patch = this.navigation.load(articleKey);

    // Load article filter config
    deferField(patch, 'articleFilterConfig', () =>
      this.storage.filters(articleKey),
    );

    // Load shuffle mode (global setting)
    patch.isShuffleMode = this.repo.readSetting('shuffle') === true;

    // Settings records are normalized lazily by group.
    deferField(patch, 'uiSettings', () => this.storage.settings());

    // Prune old caches
    this.repo.pruneArticleKeyCaches(articleKey);

    // Loading a page is not a change to its persisted list or settings.
    this.lastSavedState = mergeState(createInitialState(), patch);
    this.lastSavedState = mergeState(this.lastSavedState, {
      activeIndex: patch.lastActiveIndex ?? -1,
    });

    const original = mergeState(createInitialState(), patch);
    let compacted: string[] | undefined;
    const loadWindow = () => {
      if (compacted) return compacted;
      const path = new URL(window.location.href).pathname.replace(/\/$/, '');
      if (
        findArticleIndex(
          original.articleList,
          path,
          original.lastActiveIndex,
        ) <= 200
      ) {
        compacted = original.articleList;
        return compacted;
      }
      compacted = compactNavigationArticles(
        original.articleList,
        path,
        original.lastActiveIndex,
        original.seriesChannels,
        original.isSeriesMode &&
          (original.isScrapMode || original.seriesChannels.length === 0),
      );
      return compacted;
    };
    deferField(patch, 'articleList', loadWindow);
    deferField(patch, 'lastActiveIndex', () => {
      const removed = original.articleList.length - loadWindow().length;
      const saved = original.lastActiveIndex;
      return saved >= removed ? saved - removed : -1;
    });

    return patch;
  }

  /**
   * Save current state to IndexedDB.
   */
  saveConfig(state: Readonly<AppState>): void {
    try {
      this.writeConfig(state);
    } catch (error) {
      this.invalidateSavedState();
      throw error;
    }
  }

  invalidateSavedState(): void {
    this.lastSavedState = undefined;
  }

  private writeConfig(state: Readonly<AppState>): void {
    const previous = this.lastSavedState;
    if (previous === state) return;

    // Global settings — saved regardless of articleKey
    if (!sameField(previous, state, 'uiSettings')) {
      this.storage.saveSettings(state.uiSettings, previous?.uiSettings);
    }
    if (!sameField(previous, state, 'articleFilterConfig')) {
      this.storage.saveFilters(
        state.articleFilterConfig,
        previous?.articleFilterConfig,
      );
    }
    if (!sameField(previous, state, 'isShuffleMode')) {
      this.repo.saveSetting('shuffle', state.isShuffleMode);
    }

    this.navigation.save(state, previous);
    this.lastSavedState = state;
  }

  saveLastActiveIndex(articleKey: string, activeIndex: number): void {
    this.navigation.saveLastActiveIndex(articleKey, activeIndex);
  }

  restoreReadingSession(session: ReadingSession, articleKey: string): void {
    this.navigation.restoreReadingSession(session, articleKey);
  }

  copySeriesStorage(
    sourceArticleKey: string,
    targetArticleKey: string,
    articleList: string[],
    activeIndex: number,
    searchQuery: string,
  ): void {
    this.navigation.copySeriesStorage(
      sourceArticleKey,
      targetArticleKey,
      articleList,
      activeIndex,
      searchQuery,
    );
  }
}
