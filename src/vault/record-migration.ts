import { cleanQuery, storedMode, contextKey } from './navigation-record';
/** Temporary v1 string-store import. The native read/write path never calls this. */
import {
  normalizeArticles,
  normalizeFilters,
  normalizeUISettings,
  stringList,
} from './config-schema';
import { normalizeSessionMetadata } from './reading-session-schema';
import { readLegacyReadingSessions } from './reading-history-migration';
import { articleWindow, sessionArticleLimit } from './article-window';
import { SETTINGS_GROUPS } from './config-storage-keys';
import {
  SESSION_LIMIT,
  SESSION_ARTICLE_LIMIT,
  SESSION_TOTAL_ARTICLE_LIMIT,
  ARTICLE_KEY_CACHE_LIMIT,
} from './storage-keys';
import { isChannelId } from './record-schema';
import type { DataRow, RecordAddress, RecordStore } from './record-schema';
export interface ImportedRecord extends RecordAddress {
  value: DataRow;
}
const json = (raw: string | undefined): any => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export function importLegacyRecords(
  values: ReadonlyMap<string, string>,
  origin = 'https://arca.live',
  currentId = '',
): ImportedRecord[] {
  const output: ImportedRecord[] = [];
  const put = (store: RecordStore, key: any, value: DataRow) =>
    output.push({ store, key, value });
  const settings = normalizeUISettings(json(values.get('arcaFeed:uiSettings')));
  for (const group of SETTINGS_GROUPS) {
    const key = group.key;
    const legacyKey = `arcaFeed:${key}Settings`;
    if (values.has(legacyKey) || values.has('arcaFeed:uiSettings')) {
      const source = values.has(legacyKey)
        ? normalizeUISettings(json(values.get(legacyKey)))
        : settings;
      put('settings', key, {
        id: key,
        value: Object.fromEntries(
          group.fields.map((field) => [field, source[field]]),
        ),
      });
    }
  }
  if (values.has('arcaFeed:lastModalTab') || values.has('arcaFeed:uiSettings'))
    put('settings', 'lastModalTab', {
      id: 'lastModalTab',
      value: values.get('arcaFeed:lastModalTab') ?? settings.lastModalTab,
    });
  if (values.has('arcaFeed:isShuffleMode'))
    put('settings', 'shuffle', {
      id: 'shuffle',
      value: values.get('arcaFeed:isShuffleMode') === 'true',
    });
  if (values.has('arca_version_info'))
    put('settings', 'versionInfo', {
      id: 'versionInfo',
      value: values.get('arca_version_info'),
    });
  const filters: DataRow = {};
  const global = json(values.get('arcaFeed:articleFilterConfig'));
  if (global) Object.assign(filters, normalizeFilters(global));
  for (const [key, raw] of values) {
    if (!global && key.endsWith(':articleFilterConfig'))
      Object.assign(filters, normalizeFilters(json(raw)));
    if (key.startsWith('arcaFeed:channelFilter:')) {
      const id = key.slice('arcaFeed:channelFilter:'.length);
      Object.assign(filters, normalizeFilters({ [id]: json(raw) }));
    }
  }
  for (const [id, value] of Object.entries(filters))
    put('channelFilters', id, { id, value });
  const navigation = new Set<string>();
  for (const key of values.keys()) {
    const match =
      /^arcaFeed:(.+):(articleList|seriesMode|scrapMode|seriesChannels|subscriptionFailures|searchQuery|lastActiveIndex)$/.exec(
        key,
      );
    if (match?.[1]) navigation.add(match[1]);
  }
  const recent = stringList(json(values.get('arcaFeed:recentArticleKeys')));
  const ids = [
    ...new Set([...(currentId ? [currentId] : []), ...recent, ...navigation]),
  ]
    .filter((id) => navigation.has(id))
    .slice(0, ARTICLE_KEY_CACHE_LIMIT);
  ids.forEach((id, index) => {
    const get = (field: string) => values.get(`arcaFeed:${id}:${field}`);
    const channels = stringList(json(get('seriesChannels'))).filter(
      isChannelId,
    );
    const paths = normalizeArticles(json(get('articleList')), origin);
    put('navigationSessions', id, {
      id,
      mode: storedMode(
        get('seriesMode') === 'true',
        get('scrapMode') === 'true' && get('seriesMode') === 'true',
        channels,
      ),
      channels,
      query: cleanQuery(get('searchQuery') ?? ''),
      failures: json(get('subscriptionFailures')) ?? [],
      listVersion: 'import',
      lastUsedAt: ids.length - index,
    });
    const activeIndex = Number(get('lastActiveIndex') ?? -1);
    put('progress', ['navigation', id], {
      kind: 'navigation',
      id,
      activeIndex:
        Number.isSafeInteger(activeIndex) && activeIndex >= -1
          ? activeIndex
          : -1,
      updatedAt: ids.length - index,
    });
    put('lists', ['navigation', id], {
      kind: 'navigation',
      id,
      paths,
      version: 'import',
    });
  });
  const history = json(values.get('arcaFeed:readingHistory'));
  const progress = json(values.get('arcaFeed:readingProgress'));
  let sessions: any[] =
    history?.version === 2
      ? Array.isArray(history.sessions)
        ? history.sessions
        : []
      : readLegacyReadingSessions(
          history,
          origin,
          SESSION_LIMIT,
          SESSION_ARTICLE_LIMIT,
        );
  const latestDate = (metadata: any) => {
    const position = Array.isArray(progress)
      ? progress.find(
          (item) =>
            item?.id === metadata.id &&
            item.path === metadata.path &&
            Number.isFinite(item.updatedAt),
        )
      : undefined;
    return Math.max(metadata.updatedAt, position?.updatedAt ?? 0);
  };
  sessions = sessions
    .map((item) => ({ item, metadata: normalizeSessionMetadata(item, origin) }))
    .filter(({ metadata }) => metadata)
    .sort(
      (a, b) =>
        Number(!!b.metadata?.pinned) - Number(!!a.metadata?.pinned) ||
        latestDate(b.metadata) - latestDate(a.metadata),
    );
  const seen = new Set<string>();
  let remaining = SESSION_TOTAL_ARTICLE_LIMIT;
  for (const { item, metadata } of sessions) {
    if (
      output.filter((row) => row.store === 'resumeSessions').length >=
      SESSION_LIMIT
    )
      break;
    const channels = metadata.seriesChannels;
    const mode = storedMode(
      metadata.isSeriesMode,
      metadata.isScrapMode,
      channels,
    );
    const record = {
      id: metadata.id,
      label: metadata.label,
      customName: metadata.customName ?? '',
      pinned: !!metadata.pinned,
      path: metadata.path,
      query: cleanQuery(metadata.searchQuery),
      mode,
      channels,
      updatedAt: metadata.updatedAt,
      navigationId: metadata.id.startsWith('series:')
        ? metadata.id.slice(7)
        : undefined,
    };
    const identity = contextKey(record);
    const token = JSON.stringify(identity);
    if (seen.has(token)) continue;
    seen.add(token);
    const reserved = Math.min(SESSION_LIMIT, sessions.length) - seen.size;
    const limit = sessionArticleLimit(remaining, reserved);
    const links =
      history?.version === 2
        ? json(
            values.get(
              `arcaFeed:readingList:${encodeURIComponent(metadata.id)}`,
            ),
          )
        : item.articleList;
    const paths = articleWindow(
      normalizeArticles(links, origin),
      metadata.path,
      Math.min(
        limit,
        Number.isSafeInteger(item.articleCount) && item.articleCount > 0
          ? item.articleCount
          : limit,
      ),
    );
    remaining -= paths.length;
    put('resumeSessions', record.id, {
      ...record,
      contextKey: identity,
      articleCount: paths.length,
      listVersion: 'import',
    });
    put('lists', ['resume', record.id], {
      kind: 'resume',
      id: record.id,
      paths,
      version: 'import',
    });
    const position = Array.isArray(progress)
      ? progress.find(
          (p) =>
            p?.id === record.id &&
            p.path === record.path &&
            p.updatedAt >= record.updatedAt &&
            Number.isFinite(p.scrollY) &&
            p.scrollY >= 0,
        )
      : undefined;
    put('progress', ['resume', record.id], {
      kind: 'resume',
      id: record.id,
      path: record.path,
      scrollY: position?.scrollY ?? metadata.scrollY,
      updatedAt: position?.updatedAt ?? metadata.updatedAt,
      sequence:
        sessions.length -
        output.filter((row) => row.store === 'resumeSessions').length,
    });
  }
  return output;
}
