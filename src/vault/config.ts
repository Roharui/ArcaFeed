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
const PLUGIN_SETTINGS_KEY = 'arcaFeed:pluginSettings';

const CHANNEL_OR_ARTICLE_PAGE_REGEX = /^\/b\/[a-zA-Z0-9]+(\/\d+)?\/?$/;

export class ConfigService {
  constructor(private repo: StorageRepository) {}

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

  loadConfig(): Partial<AppState> {
    const articleKey = this.ensureArticleKey();
    const patch: Partial<AppState> = { articleKey };

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

    // Load UI settings
    const uiSettings = this.repo.getJSON<UISettings>(UI_SETTINGS_KEY);
    if (uiSettings) {
      patch.uiSettings = uiSettings;
    }

    // Load plugin settings (global)
    const pluginSettings = this.repo.getJSON<Record<string, boolean>>(
      PLUGIN_SETTINGS_KEY,
    );
    if (pluginSettings) {
      patch.pluginSettings = pluginSettings;
    }

    // Prune old caches
    this.repo.pruneArticleKeyCaches(articleKey);

    return patch;
  }

  saveConfig(state: Readonly<AppState>): void {
    const { articleKey } = state;

    // Global settings — saved regardless of articleKey
    this.repo.setJSON(UI_SETTINGS_KEY, state.uiSettings);
    this.repo.setJSON(PLUGIN_SETTINGS_KEY, state.pluginSettings);
    this.repo.setJSON(
      ARTICLE_FILTER_CONFIG_GLOBAL_KEY,
      state.articleFilterConfig,
    );

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

  saveLastActiveIndex(articleKey: string, activeIndex: number): void {
    if (!articleKey) return;
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'lastActiveIndex'),
      activeIndex.toString(),
    );
  }

  copySeriesStorage(
    sourceArticleKey: string,
    targetArticleKey: string,
    articleList: string[],
    activeIndex: number,
    searchQuery: string,
  ): void {
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
