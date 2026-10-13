import type {
  ArticleFilterConfigImpl,
  ArticleFilterImpl,
  UISettings,
} from '@/types';
import type { StorageRepository } from './repository';
import {
  normalizeFilters,
  normalizeUISettings,
  stringList,
} from './config-schema';
import { deferField, sameField } from './lazy-state';
import {
  FILTER_CHANNELS_KEY,
  channelFilterKey,
  SETTINGS_GROUPS,
  SETTINGS_VERSION_KEY,
  LAST_MODAL_TAB_KEY,
} from './config-storage-keys';
import {
  migrateLegacyFilters,
  migrateLegacySettings,
} from './config-storage-migration';

const validChannel = (id: string): boolean => /^[a-zA-Z0-9]+$/.test(id);

export class ConfigStorage {
  constructor(private repo: StorageRepository) {}

  private channelIds(): string[] {
    return stringList(this.repo.getJSON<unknown>(FILTER_CHANNELS_KEY)).filter(
      validChannel,
    );
  }

  filters(articleKey: string): ArticleFilterConfigImpl {
    let checkedMigration = false;
    const ensureMigrated = () => {
      if (checkedMigration) return;
      // Temporary compatibility hook; remove with config-storage-migration.ts.
      migrateLegacyFilters(this.repo, articleKey);
      checkedMigration = true;
    };
    let ids: string[] | undefined;
    const index = () => {
      ensureMigrated();
      return (ids ??= this.channelIds());
    };
    const getters = new Map<string, () => ArticleFilterImpl | undefined>();
    const getter = (id: string) => {
      if (!getters.has(id)) {
        let loaded = false;
        let value: ArticleFilterImpl | undefined;
        getters.set(id, () => {
          if (!loaded) {
            ensureMigrated();
            value = normalizeFilters({
              [id]: this.repo.getJSON<unknown>(channelFilterKey(id)),
            })[id];
            loaded = true;
          }
          return value;
        });
      }
      return getters.get(id)!;
    };
    return new Proxy({} as ArticleFilterConfigImpl, {
      get: (_, id) =>
        typeof id === 'string' && validChannel(id) ? getter(id)() : undefined,
      ownKeys: index,
      getOwnPropertyDescriptor: (_, id) =>
        typeof id === 'string' && validChannel(id) && index().includes(id)
          ? { configurable: true, enumerable: true, get: getter(id) }
          : undefined,
    });
  }

  saveFilters(
    next: ArticleFilterConfigImpl,
    previous?: ArticleFilterConfigImpl,
  ): void {
    const ids = Object.keys(next).filter(validChannel);
    const previousIds = previous
      ? Object.keys(previous).filter(validChannel)
      : this.channelIds();
    const removed = previousIds.filter((id) => !ids.includes(id));
    for (const id of ids) {
      if (!sameField(previous, next, id))
        this.repo.setJSON(channelFilterKey(id), next[id]);
    }
    const retained = this.channelIds().filter((id) => !removed.includes(id));
    this.repo.setJSON(FILTER_CHANNELS_KEY, [...new Set([...retained, ...ids])]);
    for (const id of removed) this.repo.removeItem(channelFilterKey(id));
  }

  settings(): UISettings {
    const settings = normalizeUISettings(null);
    let checkedMigration = false;
    const ensureMigrated = () => {
      if (checkedMigration) return;
      migrateLegacySettings(this.repo);
      checkedMigration = true;
    };
    for (const { key, fields } of SETTINGS_GROUPS) {
      let group: UISettings | undefined;
      const load = () => {
        ensureMigrated();
        return (group ??= normalizeUISettings(this.repo.getJSON<unknown>(key)));
      };
      for (const field of fields)
        deferField(settings, field, () => load()[field]);
    }
    deferField(settings, 'lastModalTab', () => {
      ensureMigrated();
      return normalizeUISettings({
        lastModalTab: this.repo.getItem(LAST_MODAL_TAB_KEY),
      }).lastModalTab;
    });
    return settings;
  }

  saveSettings(next: UISettings, previous?: UISettings): void {
    for (const { key, fields } of SETTINGS_GROUPS) {
      if (fields.some((field) => !sameField(previous, next, field))) {
        this.repo.setJSON(
          key,
          Object.fromEntries(fields.map((field) => [field, next[field]])),
        );
      }
    }
    if (!sameField(previous, next, 'lastModalTab'))
      this.repo.setItem(LAST_MODAL_TAB_KEY, next.lastModalTab);
    this.repo.setItem(SETTINGS_VERSION_KEY, '2');
  }
}
