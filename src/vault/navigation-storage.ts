import { normalizeSubscriptionFailures } from './subscription-failures';
import { deferField, sameField } from '@feed/core/vault/lazy-state';
import { normalizeArticles, stringList } from './config-schema';
import { cleanQuery, storedMode } from './navigation-record';
import { isChannelId } from './record-schema';
import type { StorageRepository } from './repository';
import type { AppState } from './store';
import type { ReadingSession } from './reading-history';
/** Metadata, frequently changed cursor, and large lists have independent records. */
export class NavigationStorage {
  constructor(private repo: StorageRepository) {}
  load(articleKey: string): Partial<AppState> {
    const record = this.repo.readNavigation(articleKey);
    const patch: Partial<AppState> = { articleKey };
    deferField(patch, 'articleList', () =>
      normalizeArticles(
        this.repo.readList('navigation', articleKey),
        window.location.origin,
      ),
    );
    patch.isSeriesMode =
      record?.mode === 'series' ||
      record?.mode === 'scrap' ||
      record?.mode === 'subscription';
    patch.isScrapMode = record?.mode === 'scrap';
    deferField(patch, 'seriesChannels', () =>
      stringList(record?.channels).filter(isChannelId),
    );
    deferField(patch, 'subscriptionFailures', () =>
      normalizeSubscriptionFailures(record?.failures),
    );
    patch.searchQuery =
      typeof record?.query === 'string' && record.query
        ? cleanQuery(record.query)
        : '';
    patch.nextPageUrl =
      typeof record?.nextPageUrl === 'string' ? record.nextPageUrl : '';
    const index = this.repo.navigationPosition(articleKey)?.activeIndex;
    patch.lastActiveIndex =
      Number.isSafeInteger(index) && index >= -1 ? index : -1;
    return patch;
  }
  save(state: Readonly<AppState>, previous?: Readonly<AppState>): void {
    const id = state.articleKey;
    if (!id) return;
    const fresh =
      !previous || previous.articleKey !== id || !this.repo.readNavigation(id);
    let record = this.repo.readNavigation(id) ?? { id };
    let changed = false;
    if (fresh || !sameField(previous, state, 'articleList')) {
      record = {
        ...record,
        listVersion: this.repo.saveList('navigation', id, state.articleList),
      };
      changed = true;
    }
    if (
      fresh ||
      (
        [
          'isSeriesMode',
          'isScrapMode',
          'seriesChannels',
          'subscriptionFailures',
          'searchQuery',
          'nextPageUrl',
        ] as const
      ).some((field) => !sameField(previous, state, field))
    ) {
      record = {
        ...record,
        mode: storedMode(
          state.isSeriesMode,
          state.isScrapMode,
          state.seriesChannels,
        ),
        channels: [...state.seriesChannels],
        failures: state.subscriptionFailures.map((item) => ({ ...item })),
        query: cleanQuery(state.searchQuery),
        nextPageUrl: state.nextPageUrl,
      };
      changed = true;
    }
    if (changed)
      this.repo.saveNavigation(id, { ...record, lastUsedAt: Date.now() });
    if (fresh || !sameField(previous, state, 'activeIndex'))
      this.saveLastActiveIndex(id, state.activeIndex);
    if (fresh) this.repo.pruneArticleKeyCaches(id);
  }
  saveLastActiveIndex(id: string, index: number): void {
    if (id) this.repo.saveNavigationPosition(id, index);
  }
  restoreReadingSession(session: ReadingSession, id: string): void {
    const paths = [...session.articleList];
    let index = paths.indexOf(session.path);
    if (index === -1) {
      paths.unshift(session.path);
      index = 0;
    }
    const listVersion = this.repo.saveList('navigation', id, paths);
    this.repo.saveNavigation(id, {
      id,
      mode: storedMode(
        session.isSeriesMode,
        session.isScrapMode,
        session.seriesChannels,
      ),
      channels: [...session.seriesChannels],
      query: cleanQuery(session.searchQuery),
      nextPageUrl: '',
      failures: [],
      listVersion,
      lastUsedAt: Date.now(),
    });
    this.saveLastActiveIndex(id, index);
    this.repo.pruneArticleKeyCaches(id);
  }
  copySeriesStorage(
    _sourceId: string,
    id: string,
    articles: string[],
    activeIndex: number,
    query: string,
  ): void {
    const paths = normalizeArticles(articles, window.location.origin);
    const listVersion = this.repo.saveList('navigation', id, paths);
    this.repo.saveNavigation(id, {
      id,
      mode: 'series',
      channels: [],
      query: cleanQuery(query),
      nextPageUrl: '',
      failures: [],
      listVersion,
      lastUsedAt: Date.now(),
    });
    this.saveLastActiveIndex(id, activeIndex);
    this.repo.pruneArticleKeyCaches(id);
  }
}
