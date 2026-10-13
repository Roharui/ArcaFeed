import { deferField, mergeState, sameField } from './lazy-state';
/**
 * Config Service - handles loading and saving application configuration.
 * Uses StorageRepository instead of directly accessing localStorage.
 */

import { StorageRepository } from './repository';
import { createArticleKey } from '@/utils/article-key';
import { appendSearchParam } from '@/utils/url';
import { compactNavigationArticles, findArticleIndex } from './article-window';
import {
  normalizeArticles,
  normalizeFilters,
  normalizeUISettings,
  stringList,
} from './config-schema';

import type { AppState } from '@/vault/store';
import { createInitialState } from './store';
import type { ReadingSession } from './reading-history';

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
    deferField(patch, 'articleFilterConfig', () =>
      normalizeFilters(
        this.repo.getJSON<unknown>(ARTICLE_FILTER_CONFIG_GLOBAL_KEY) ??
          this.repo.getJSON<unknown>(
            this.repo.scopedKey(articleKey, 'articleFilterConfig'),
          ) ??
          {},
      ),
    );

    // Load article list
    deferField(patch, 'articleList', () =>
      normalizeArticles(
        this.repo.getJSON<unknown>(
          this.repo.scopedKey(articleKey, 'articleList'),
        ),
        window.location.origin,
      ),
    );

    // Load series mode
    patch.isSeriesMode =
      this.repo.getItem(this.repo.scopedKey(articleKey, 'seriesMode')) ===
      'true';

    patch.isScrapMode =
      patch.isSeriesMode &&
      this.repo.getItem(this.repo.scopedKey(articleKey, 'scrapMode')) ===
        'true';

    deferField(patch, 'seriesChannels', () =>
      stringList(
        this.repo.getJSON<unknown>(
          this.repo.scopedKey(articleKey, 'seriesChannels'),
        ),
      ).filter((channel) => /^[a-zA-Z0-9]+$/.test(channel)),
    );

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
    deferField(patch, 'uiSettings', () =>
      normalizeUISettings(this.repo.getJSON<unknown>(UI_SETTINGS_KEY)),
    );

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
   * Save current state to localStorage.
   */
  saveConfig(state: Readonly<AppState>): void {
    const { articleKey } = state;
    const previous = this.lastSavedState;
    const newSession = !previous || previous.articleKey !== articleKey;

    // Global settings — saved regardless of articleKey
    if (!sameField(previous, state, 'uiSettings')) {
      this.repo.setJSON(UI_SETTINGS_KEY, state.uiSettings);
    }
    if (!sameField(previous, state, 'articleFilterConfig')) {
      this.repo.setJSON(
        ARTICLE_FILTER_CONFIG_GLOBAL_KEY,
        state.articleFilterConfig,
      );
    }
    if (!sameField(previous, state, 'isShuffleMode')) {
      this.repo.setItem(SHUFFLE_MODE_KEY, state.isShuffleMode.toString());
    }

    // Per-articleKey scoped storage
    if (articleKey) {
      if (newSession || !sameField(previous, state, 'articleList')) {
        this.repo.setJSON(
          this.repo.scopedKey(articleKey, 'articleList'),
          state.articleList,
        );
      }
      if (newSession || !sameField(previous, state, 'isSeriesMode')) {
        this.repo.setItem(
          this.repo.scopedKey(articleKey, 'seriesMode'),
          state.isSeriesMode.toString(),
        );
      }
      if (newSession || !sameField(previous, state, 'isScrapMode')) {
        this.repo.setItem(
          this.repo.scopedKey(articleKey, 'scrapMode'),
          state.isScrapMode.toString(),
        );
      }
      if (newSession || !sameField(previous, state, 'seriesChannels')) {
        this.repo.setJSON(
          this.repo.scopedKey(articleKey, 'seriesChannels'),
          state.seriesChannels,
        );
      }
      if (newSession || !sameField(previous, state, 'searchQuery')) {
        this.repo.setItem(
          this.repo.scopedKey(articleKey, 'searchQuery'),
          state.searchQuery,
        );
      }
      if (newSession || !sameField(previous, state, 'activeIndex')) {
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

  restoreReadingSession(session: ReadingSession, articleKey: string): void {
    const articleList = [...session.articleList];
    let index = articleList.indexOf(session.path);
    if (index === -1) {
      articleList.unshift(session.path);
      index = 0;
    }
    this.repo.setJSON(
      this.repo.scopedKey(articleKey, 'articleList'),
      articleList,
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'seriesMode'),
      String(session.isSeriesMode),
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'scrapMode'),
      String(session.isScrapMode),
    );
    this.repo.setJSON(
      this.repo.scopedKey(articleKey, 'seriesChannels'),
      session.seriesChannels,
    );
    this.repo.setItem(
      this.repo.scopedKey(articleKey, 'searchQuery'),
      appendSearchParam(session.searchQuery, 'articleKey', articleKey),
    );
    this.saveLastActiveIndex(articleKey, index);
    this.repo.pruneArticleKeyCaches(articleKey);
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
      this.repo.scopedKey(targetArticleKey, 'scrapMode'),
      'false',
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
    this.repo.pruneArticleKeyCaches(targetArticleKey);
  }
}
