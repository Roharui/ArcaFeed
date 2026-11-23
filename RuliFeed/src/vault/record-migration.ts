import { createLegacyRecordImporter } from '@feed/core/vault/record-migration';
import type { ImportedRecord } from '@feed/core/vault/record-migration';
import { contextKey } from './navigation-record';
import {
  normalizeArticles,
  normalizeFilters,
  normalizeUISettings,
} from './config-schema';
import { normalizeSessionMetadata } from './reading-session-schema';
import { readLegacyReadingSessions } from './reading-history-migration';
import { isChannelId } from './record-schema';

export type { ImportedRecord };

export const importLegacyRecords = createLegacyRecordImporter({
  prefix: 'ruliFeed',
  versionKey: 'ruli_version_info',
  defaultOrigin: 'https://bbs.ruliweb.com',
  isChannelId,
  normalizeArticles,
  normalizeFilters,
  normalizeUISettings,
  normalizeSessionMetadata,
  readLegacyReadingSessions,
  contextKey,
});
