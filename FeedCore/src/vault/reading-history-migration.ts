/** Legacy embedded-list reader used only by record-migration during database upgrade. */
import { articleWindow } from './article-window';
import type { ReadingSession } from './reading-session-schema';

export interface LegacyReadingSessionsOptions {
  normalizeSessionMetadata: (
    value: unknown,
    origin: string,
  ) => Omit<ReadingSession, 'articleList'> | null;
  normalizeArticles: (value: unknown, origin: string) => string[];
}

export function readLegacyReadingSessionsWith(
  value: unknown,
  origin: string,
  sessionLimit: number,
  articleLimit: number,
  { normalizeSessionMetadata, normalizeArticles }: LegacyReadingSessionsOptions,
): ReadingSession[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('sessions' in value) ||
    !Array.isArray(value.sessions)
  )
    return [];
  const sessions: ReadingSession[] = [];
  const seen = new Set<string>();
  for (const item of value.sessions) {
    const metadata = normalizeSessionMetadata(item, origin);
    if (!metadata || seen.has(metadata.id)) continue;
    seen.add(metadata.id);
    sessions.push({
      ...metadata,
      articleList: articleWindow(
        normalizeArticles(item.articleList, origin),
        metadata.path,
        articleLimit,
      ),
    });
    if (sessions.length === sessionLimit) break;
  }
  return sessions;
}
