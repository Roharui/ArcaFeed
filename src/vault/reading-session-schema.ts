import { normalizeSessionMetadataWith } from '@feed/core/vault/reading-session-schema';
import type { ReadingSession } from '@feed/core/vault/reading-session-schema';
import { normalizeArticles } from './config-schema';
import { isChannelId } from './record-schema';

export function normalizeSessionMetadata(
  value: unknown,
  origin: string,
): Omit<ReadingSession, 'articleList'> | null {
  return normalizeSessionMetadataWith(value, origin, {
    normalizeArticles,
    isChannelId,
  });
}
