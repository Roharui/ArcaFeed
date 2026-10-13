import { normalizeArticles, stringList } from './config-schema';
import type { ReadingSession } from './reading-history';

export function normalizeSessionMetadata(
  value: unknown,
  origin: string,
): Omit<ReadingSession, 'articleList'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const path = normalizeArticles([item.path], origin)[0];
  const id = typeof item.id === 'string' ? item.id.slice(0, 300) : '';
  const updatedAt =
    typeof item.updatedAt === 'number' &&
    Number.isFinite(item.updatedAt) &&
    item.updatedAt > 0
      ? item.updatedAt
      : 0;
  if (!path || !id || !updatedAt) return null;
  const params = new URLSearchParams(
    typeof item.searchQuery === 'string' ? item.searchQuery.slice(0, 4000) : '',
  );
  params.delete('articleKey');
  return {
    id,
    path,
    updatedAt,
    label: typeof item.label === 'string' ? item.label.slice(0, 300) : path,
    searchQuery: params.size ? `?${params}` : '',
    isSeriesMode: item.isSeriesMode === true,
    isScrapMode: item.isScrapMode === true,
    seriesChannels: stringList(item.seriesChannels).filter((channel) =>
      /^[a-zA-Z0-9]+$/.test(channel),
    ),
    scrollY:
      typeof item.scrollY === 'number' && Number.isFinite(item.scrollY)
        ? Math.max(0, item.scrollY)
        : 0,
  };
}
