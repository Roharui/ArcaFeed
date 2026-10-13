/** Temporary legacy configuration migration. See docs/ARCHITECTURE.md for removal points. */
import type { StorageRepository } from './repository';
import { normalizeFilters, normalizeUISettings } from './config-schema';
import {
  FILTER_CHANNELS_KEY,
  channelFilterKey,
  SETTINGS_GROUPS,
  SETTINGS_VERSION_KEY,
  LAST_MODAL_TAB_KEY,
} from './config-storage-keys';

export function migrateLegacyFilters(
  repo: StorageRepository,
  articleKey: string,
): void {
  if (repo.getItem(FILTER_CHANNELS_KEY) !== null) return;
  const global = repo.getJSON<unknown>('arcaFeed:articleFilterConfig');
  const scoped =
    global ??
    repo.getJSON<unknown>(repo.scopedKey(articleKey, 'articleFilterConfig'));
  if (scoped === null) return;
  const filters = normalizeFilters(scoped);
  for (const id of Object.keys(filters)) {
    if (repo.getItem(channelFilterKey(id)) === null)
      repo.setJSON(channelFilterKey(id), filters[id]);
  }
  repo.setJSON(FILTER_CHANNELS_KEY, Object.keys(filters));
}

export function migrateLegacySettings(repo: StorageRepository): void {
  if (repo.getItem(SETTINGS_VERSION_KEY) === '2') return;
  const legacy = repo.getJSON<unknown>('arcaFeed:uiSettings');
  if (legacy === null) return;
  const settings = normalizeUISettings(legacy);
  for (const { key, fields } of SETTINGS_GROUPS) {
    if (repo.getItem(key) === null)
      repo.setJSON(
        key,
        Object.fromEntries(fields.map((field) => [field, settings[field]])),
      );
  }
  if (repo.getItem(LAST_MODAL_TAB_KEY) === null)
    repo.setItem(LAST_MODAL_TAB_KEY, settings.lastModalTab);
  repo.setItem(SETTINGS_VERSION_KEY, '2');
}
