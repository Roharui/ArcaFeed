import { ConfigStorage as CoreConfigStorage } from '@feed/core/vault/config-storage';
import type { StorageRepository } from './repository';
import { normalizeFilters, normalizeUISettings } from './config-schema';
import { isChannelId } from './record-schema';

export class ConfigStorage extends CoreConfigStorage {
  constructor(repo: StorageRepository) {
    super(repo, {
      isChannelId,
      normalizeFilters,
      normalizeUISettings,
    });
  }
}
