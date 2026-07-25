/**
 * Config Service - handles loading and saving application configuration.
 * Uses StorageRepository instead of directly accessing localStorage.
 */

import { StorageRepository } from './repository';
import {
  createDefaultHomeSeriesState,
  inferLegacyHomeSeriesState,
  normalizeArticleFilterConfig,
  normalizeArticleList,
  normalizeHomeSeriesState,
  normalizeSeriesSource,
  normalizeStoredIndex,
  normalizeUISettings,
  readLegacyHomeSeriesChannels,
} from './schema';
import { createArticleKey } from '@/utils/article-key';
import { appendSearchParam } from '@/utils/url';
import { parseHref } from '@/utils/regex';

import type { AppState } from './store';

const ARTICLE_FILTER_CONFIG_GLOBAL_KEY = 'arcaFeed:articleFilterConfig';
const UI_SETTINGS_KEY = 'arcaFeed:uiSettings';

export class ConfigService {
  private repo: StorageRepository;

  constructor(repo: StorageRepository) {
    this.repo = repo;
  }

  /**
   * Ensure the current page has an articleKey in its URL query params.
   */
  ensureArticleKey(): string {
    const currentUrl = new URL(window.location.href);
    const mode = parseHref(currentUrl.toString()).mode;
    if (mode !== 'CHANNEL' && mode !== 'ARTICLE') {
      return '';
    }

    const existingKey = currentUrl.searchParams.get('articleKey');
    if (existingKey) return existingKey;

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
    const rawUISettings = this.repo.getJSON<unknown>(UI_SETTINGS_KEY);
    const legacyHomeSeriesChannels =
      readLegacyHomeSeriesChannels(rawUISettings);
    if (rawUISettings !== null) {
      patch.uiSettings = normalizeUISettings(rawUISettings);
    }

    // Load article filter config
    const filterConfig =
      this.repo.getJSON<unknown>(ARTICLE_FILTER_CONFIG_GLOBAL_KEY) ??
      (articleKey
        ? this.repo.getJSON<unknown>(
            this.repo.scopedKey(articleKey, 'articleFilterConfig'),
          )
        : null);
    patch.articleFilterConfig = normalizeArticleFilterConfig(filterConfig);

    if (articleKey) {
      const articleList = normalizeArticleList(
        this.repo.getJSON<unknown>(
          this.repo.scopedKey(articleKey, 'articleList'),
        ),
      );
      patch.articleList = articleList;
      const legacySeriesMode =
        this.repo.getItem(this.repo.scopedKey(articleKey, 'seriesMode')) ===
        'true';
      const storedSeriesSource = this.repo.getItem(
        this.repo.scopedKey(articleKey, 'seriesSource'),
      );
      patch.seriesSource = normalizeSeriesSource(
        storedSeriesSource,
        legacySeriesMode,
      );
      patch.homeSeriesState = normalizeHomeSeriesState(
        this.repo.getJSON<unknown>(
          this.repo.scopedKey(articleKey, 'homeSeriesState'),
        ),
      );
      if (storedSeriesSource === null && legacySeriesMode) {
        const legacyHomeSeriesState = inferLegacyHomeSeriesState(
          articleList,
          legacyHomeSeriesChannels,
        );
        if (legacyHomeSeriesState) {
          patch.seriesSource = 'home';
          patch.homeSeriesState = legacyHomeSeriesState;
        }
      }
      patch.searchQuery =
        this.repo.getItem(this.repo.scopedKey(articleKey, 'searchQuery')) ?? '';
      patch.lastActiveIndex = normalizeStoredIndex(
        this.repo.getItem(this.repo.scopedKey(articleKey, 'lastActiveIndex')),
      );
      this.repo.pruneArticleKeyCaches(articleKey);
    }

    return patch;
  }

  /**
   * Save current state to localStorage.
   */
  saveConfig(state: Readonly<AppState>): void {
    const { articleKey } = state;

    this.repo.setJSON(UI_SETTINGS_KEY, state.uiSettings);
    this.repo.setJSON(
      ARTICLE_FILTER_CONFIG_GLOBAL_KEY,
      state.articleFilterConfig,
    );
    if (!articleKey) return;

    this.repo.setJSON(
      this.repo.scopedKey(articleKey, 'articleList'),
      state.articleList,
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'seriesMode'),
      (state.seriesSource !== 'none').toString(),
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'seriesSource'),
      state.seriesSource,
    );
    this.repo.setJSON(
      this.repo.scopedKey(articleKey, 'homeSeriesState'),
      state.homeSeriesState,
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'searchQuery'),
      state.searchQuery,
    );
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
    this.repo.setItem(
      this.repo.scopedKey(targetArticleKey, 'seriesSource'),
      'article',
    );
    this.repo.setJSON(
      this.repo.scopedKey(targetArticleKey, 'homeSeriesState'),
      createDefaultHomeSeriesState(),
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
