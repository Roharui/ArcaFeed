import { ReadingHistory as CoreReadingHistory } from '@feed/core/vault/reading-history';
import type { ReadingSession } from '@feed/core/vault/reading-history';
import {
  SESSION_LIMIT,
  SESSION_TOTAL_ARTICLE_LIMIT,
} from '@feed/core/vault/storage-keys';
import { StorageRepository } from './repository';
import { normalizeArticles } from './config-schema';
import { normalizeSessionMetadata } from './reading-session-schema';
import { contextKey } from './navigation-record';
import {
  SiteRecentHistory,
  SITE_RECENT_KEY,
  SITE_RECENT_DISABLED_KEY,
  SITE_RECENT_URL,
  RECENT_ENTRY_LIMIT,
  isVisitedPath,
} from './site-recent-history';
import type { ReadingEntry } from './site-recent-history';

export {
  SESSION_LIMIT,
  SESSION_TOTAL_ARTICLE_LIMIT,
  SITE_RECENT_KEY,
  SITE_RECENT_DISABLED_KEY,
  SITE_RECENT_URL,
  RECENT_ENTRY_LIMIT,
  isVisitedPath,
};
export type { ReadingEntry, ReadingSession };

export class ReadingHistory extends CoreReadingHistory<ReadingEntry> {
  constructor(repo = new StorageRepository()) {
    super(repo, {
      createSiteHistory: (repository) => new SiteRecentHistory(repository),
      normalizeArticles,
      normalizeSessionMetadata,
      contextKey,
    });
  }
}
