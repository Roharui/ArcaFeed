/**
 * Config Service - handles loading and saving application configuration.
 * Uses StorageRepository instead of directly accessing localStorage.
 */

import { StorageRepository } from './repository';
import { createArticleKey } from '@/utils/article-key';
import { appendSearchParam } from '@/utils/url';
import {
  normalizeArticles,
  normalizeFilters,
  normalizeUISettings,
} from './config-schema';

import type { AppState } from '@/vault/store';

const ARTICLE_FILTER_CONFIG_GLOBAL_KEY = 'arcaFeed:articleFilterConfig';
const UI_SETTINGS_KEY = 'arcaFeed:uiSettings';
const SHUFFLE_MODE_KEY = 'arcaFeed:isShuffleMode';

const CHANNEL_OR_ARTICLE_PAGE_REGEX = /^\/b\/[a-zA-Z0-9]+(\/\d+)?\/?$/;

export class ConfigService {
  private lastSavedState: Readonly<AppState> | undefined;

  constructor(private repo: StorageRepository) {}

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
   * Load saved config from localStorage and populate initial state.
   */
  loadConfig(): Partial<AppState> {
    const articleKey = this.ensureArticleKey();
    const patch: Partial<AppState> = { articleKey };

    // Load article filter config
    patch.articleFilterConfig = normalizeFilters(
      this.repo.getJSON<unknown>(ARTICLE_FILTER_CONFIG_GLOBAL_KEY) ??
        this.repo.getJSON<unknown>(
          this.repo.scopedKey(articleKey, 'articleFilterConfig'),
        ) ??
        {},
    );

    // Load article list
    patch.articleList = normalizeArticles(
      this.repo.getJSON<unknown>(
        this.repo.scopedKey(articleKey, 'articleList'),
      ),
      window.location.origin,
    );

    // Load series mode
    patch.isSeriesMode =
      this.repo.getItem(this.repo.scopedKey(articleKey, 'seriesMode')) ===
      'true';

    // Load search query
    patch.searchQuery =
      this.repo.getItem(this.repo.scopedKey(articleKey, 'searchQuery')) || '';

    // Load last active index
    const savedIndex = this.repo.getItem(
      this.repo.scopedKey(articleKey, 'lastActiveIndex'),
    );
    const index = savedIndex === null ? -1 : Number(savedIndex);
    patch.lastActiveIndex =
      Number.isSafeInteger(index) && index >= -1 ? index : -1;

    // Load shuffle mode (global setting)
    patch.isShuffleMode = this.repo.getItem(SHUFFLE_MODE_KEY) === 'true';

    // Load UI settings (getJSON handles null / parse errors internally)
    patch.uiSettings = normalizeUISettings(
      this.repo.getJSON<unknown>(UI_SETTINGS_KEY),
    );

    // Prune old caches
    this.repo.pruneArticleKeyCaches(articleKey);

    return patch;
  }

  /**
   * Save current state to localStorage.
   */
  saveConfig(state: Readonly<AppState>): void {
    const { articleKey } = state;
    const previous = this.lastSavedState;
    const newSession = !previous || previous.articleKey !== articleKey;

    // Global settings — saved regardless of articleKey
    if (previous?.uiSettings !== state.uiSettings) {
      this.repo.setJSON(UI_SETTINGS_KEY, state.uiSettings);
    }
    if (previous?.articleFilterConfig !== state.articleFilterConfig) {
      this.repo.setJSON(
        ARTICLE_FILTER_CONFIG_GLOBAL_KEY,
        state.articleFilterConfig,
      );
    }
    if (previous?.isShuffleMode !== state.isShuffleMode) {
      this.repo.setItem(SHUFFLE_MODE_KEY, state.isShuffleMode.toString());
    }

    // Per-articleKey scoped storage
    if (articleKey) {
      if (newSession || previous?.articleList !== state.articleList) {
        this.repo.setJSON(
          this.repo.scopedKey(articleKey, 'articleList'),
          state.articleList,
        );
      }
      if (newSession || previous?.isSeriesMode !== state.isSeriesMode) {
        this.repo.setItem(
          this.repo.scopedKey(articleKey, 'seriesMode'),
          state.isSeriesMode.toString(),
        );
      }
      if (newSession || previous?.searchQuery !== state.searchQuery) {
        this.repo.setItem(
          this.repo.scopedKey(articleKey, 'searchQuery'),
          state.searchQuery,
        );
      }
      if (newSession || previous?.activeIndex !== state.activeIndex) {
        this.saveLastActiveIndex(articleKey, state.activeIndex);
      }
      if (newSession) this.repo.pruneArticleKeyCaches(articleKey);
    }
    this.lastSavedState = state;
  }

  /**
   * Save last active index (called more frequently than full save).
   */
  saveLastActiveIndex(articleKey: string, activeIndex: number): void {
    if (!articleKey) return;
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'lastActiveIndex'),
      activeIndex.toString(),
    );
  }

  /**
   * Copy series storage from source articleKey to target articleKey.
   */
  copySeriesStorage(
    sourceArticleKey: string,
    targetArticleKey: string,
    articleList: string[],
    activeIndex: number,
    searchQuery: string,
  ): void {
    // Copy article filter config if exists
    const filterConfig = this.repo.getItem(
      this.repo.scopedKey(sourceArticleKey, 'articleFilterConfig'),
    );

    if (filterConfig !== null) {
      this.repo.setItem(
        this.repo.scopedKey(targetArticleKey, 'articleFilterConfig'),
        filterConfig,
      );
    }

    this.repo.setItem(
      this.repo.scopedKey(targetArticleKey, 'seriesMode'),
      'true',
    );

    // Normalize article URLs to pathnames
    const normalizedList = articleList.map((href) => {
      const url = new URL(href, window.location.origin);
      return url.pathname;
    });

    const normalizedSearch = appendSearchParam(
      searchQuery,
      'articleKey',
      targetArticleKey,
    );

    this.repo.setJSON(
      this.repo.scopedKey(targetArticleKey, 'articleList'),
      normalizedList,
    );
    this.repo.setItem(
      this.repo.scopedKey(targetArticleKey, 'searchQuery'),
      normalizedSearch,
    );
    this.repo.setItem(
      this.repo.scopedKey(targetArticleKey, 'lastActiveIndex'),
      activeIndex.toString(),
    );
  }
}
