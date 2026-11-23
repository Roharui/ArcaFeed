import { stringList } from './config-schema';
import { isRecord } from './record-schema';

export interface ReadingSession {
  id: string;
  label: string;
  customName?: string;
  pinned?: boolean;
  path: string;
  searchQuery: string;
  articleList: string[];
  isSeriesMode: boolean;
  isScrapMode: boolean;
  seriesChannels: string[];
  scrollY: number;
  updatedAt: number;
}

export interface SessionMetadataNormalizerOptions {
  normalizeArticles: (value: unknown, origin: string) => string[];
  isChannelId: (value: string) => boolean;
}

export function normalizeSessionMetadataWith(
  value: unknown,
  origin: string,
  { normalizeArticles, isChannelId }: SessionMetadataNormalizerOptions,
): Omit<ReadingSession, 'articleList'> | null {
  if (!isRecord(value)) return null;
  const item = value;
  const path = normalizeArticles([item.path], origin)[0];
  const id = typeof item.id === 'string' ? item.id.slice(0, 8000) : '';
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
    ...(typeof item.customName === 'string' && item.customName.trim()
      ? { customName: item.customName.trim().slice(0, 100) }
      : {}),
    ...(item.pinned === true ? { pinned: true } : {}),
    searchQuery: params.size ? `?${params}` : '',
    isSeriesMode: item.isSeriesMode === true,
    isScrapMode: item.isScrapMode === true,
    seriesChannels: stringList(item.seriesChannels).filter(isChannelId),
    scrollY:
      typeof item.scrollY === 'number' && Number.isFinite(item.scrollY)
        ? Math.max(0, item.scrollY)
        : 0,
  };
}
