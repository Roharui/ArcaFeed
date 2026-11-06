import { normalizeSubscriptionFailures } from './subscription-failures';
import { deferField, sameField } from './lazy-state';
import { normalizeArticles, stringList } from './config-schema';
import { appendSearchParam } from '@/utils/url';
import type { StorageRepository } from './repository';
import type { AppState } from './store';
import type { ReadingSession } from './reading-history';

/** Persistence for a single navigation session, independent of global preferences. */
export class NavigationStorage {
  constructor(private repo: StorageRepository) {}

  load(articleKey: string): Partial<AppState> {
    const patch: Partial<AppState> = { articleKey };
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

    deferField(patch, 'subscriptionFailures', () =>
      normalizeSubscriptionFailures(
        this.repo.getJSON<unknown>(
          this.repo.scopedKey(articleKey, 'subscriptionFailures'),
        ),
      ),
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

    return patch;
  }

  save(state: Readonly<AppState>, previous?: Readonly<AppState>): void {
    const { articleKey } = state;
    const newSession = !previous || previous.articleKey !== articleKey;
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
      if (newSession || !sameField(previous, state, 'subscriptionFailures')) {
        this.repo.setJSON(
          this.repo.scopedKey(articleKey, 'subscriptionFailures'),
          state.subscriptionFailures,
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
    this.repo.setJSON(
      this.repo.scopedKey(articleKey, 'subscriptionFailures'),
      [],
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
