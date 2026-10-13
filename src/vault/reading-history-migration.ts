/** Temporary legacy reader. Remove with ReadingHistory.migrateLegacyContexts after migration support ends. */
import { normalizeSessionMetadata } from './reading-session-schema';
import { normalizeArticles } from './config-schema';
import { articleWindow } from './article-window';
import type { ReadingSession } from './reading-history';

export function readLegacyReadingSessions(
  value: unknown,
  origin: string,
  sessionLimit: number,
  articleLimit: number,
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
