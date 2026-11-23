/** Legacy embedded-list reader used only by record-migration.ts during database upgrade. */
import { readLegacyReadingSessionsWith } from '@feed/core/vault/reading-history-migration';
import type { ReadingSession } from '@feed/core/vault/reading-session-schema';
import { normalizeSessionMetadata } from './reading-session-schema';
import { normalizeArticles } from './config-schema';

export function readLegacyReadingSessions(
  value: unknown,
  origin: string,
  sessionLimit: number,
  articleLimit: number,
): ReadingSession[] {
  return readLegacyReadingSessionsWith(
    value,
    origin,
    sessionLimit,
    articleLimit,
    { normalizeSessionMetadata, normalizeArticles },
  );
}
