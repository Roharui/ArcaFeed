/**
 * Config Service - handles loading and saving application configuration.
 * Uses StorageRepository instead of directly accessing localStorage.
 */

import { StorageRepository } from './repository';
import { createArticleKey } from '@/utils/article-key';
import { appendSearchParam } from '@/utils/url';

import type { AppState } from '@/core/store';
import type { ArticleFilterConfigImpl, UISettings } from '@/types';

const ARTICLE_FILTER_CONFIG_GLOBAL_KEY = 'arcaFeed:articleFilterConfig';
const UI_SETTINGS_KEY = 'arcaFeed:uiSettings';

const CHANNEL_OR_ARTICLE_PAGE_REGEX = /^\/b\/[a-zA-Z0-9]+(\/\d+)?\/?$/;

export class ConfigService {
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

    if (!articleKey) {
      return patch;
    }

    // Load article filter config
    const filterConfigStr =
      this.repo.getItem(ARTICLE_FILTER_CONFIG_GLOBAL_KEY) ||
      this.repo.getItem(this.repo.scopedKey(articleKey, 'articleFilterConfig'));

    patch.articleFilterConfig = filterConfigStr
      ? (JSON.parse(filterConfigStr) as ArticleFilterConfigImpl)
      : {};

    // Load article list
    const articleListStr = this.repo.getItem(
      this.repo.scopedKey(articleKey, 'articleList'),
    );
    patch.articleList = articleListStr ? JSON.parse(articleListStr) : [];

    // Load series mode
    patch.isSeriesMode =
      this.repo.getItem(this.repo.scopedKey(articleKey, 'seriesMode')) ===
      'true';

    // Load search query
    patch.searchQuery =
      this.repo.getItem(this.repo.scopedKey(articleKey, 'searchQuery')) || '';

    // Load last active index
    patch.lastActiveIndex = parseInt(
      this.repo.getItem(this.repo.scopedKey(articleKey, 'lastActiveIndex')) ||
        '-1',
    );

    // Load UI settings (getJSON handles null / parse errors internally)
    const uiSettings = this.repo.getJSON<UISettings>(UI_SETTINGS_KEY);
    if (uiSettings) {
      patch.uiSettings = uiSettings;
    }

    // Prune old caches
    this.repo.pruneArticleKeyCaches(articleKey);

    return patch;
  }

  /**
   * Save current state to localStorage.
   */
  saveConfig(state: Readonly<AppState>): void {
    const { articleKey } = state;

    // Global settings — saved regardless of articleKey
    this.repo.setJSON(UI_SETTINGS_KEY, state.uiSettings);
    this.repo.setJSON(
      ARTICLE_FILTER_CONFIG_GLOBAL_KEY,
      state.articleFilterConfig,
    );

    if (!articleKey) return;

    // Per-articleKey scoped storage
    this.repo.setJSON(
      this.repo.scopedKey(articleKey, 'articleList'),
      state.articleList,
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'seriesMode'),
      state.isSeriesMode.toString(),
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'searchQuery'),
      state.searchQuery,
    );

    this.repo.pruneArticleKeyCaches(articleKey);
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
