import type {
  ArticleFilterConfigImpl,
  ArticleFilterImpl,
  UISettings,
} from '@/types';
import type { StorageRepository } from './repository';
import { normalizeFilters, normalizeUISettings } from './config-schema';
import { deferField, sameField } from './lazy-state';
import { SETTINGS_GROUPS } from './config-storage-keys';

const validChannel = (id: string): boolean => /^[a-zA-Z0-9]+$/.test(id);

export class ConfigStorage {
  constructor(private repo: StorageRepository) {}

  private channelIds(): string[] {
    return this.repo.filterIds().filter(validChannel);
  }

  filters(_articleKey: string): ArticleFilterConfigImpl {
    let ids: string[] | undefined;
    const index = () => {
      return (ids ??= this.channelIds());
    };
    const getters = new Map<string, () => ArticleFilterImpl | undefined>();
    const getter = (id: string) => {
      if (!getters.has(id)) {
        let loaded = false;
        let value: ArticleFilterImpl | undefined;
        getters.set(id, () => {
          if (!loaded) {
            value = normalizeFilters({
              [id]: this.repo.readFilter(id),
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
      if (!sameField(previous, next, id)) this.repo.saveFilter(id, next[id]);
    }
    for (const id of removed) this.repo.deleteFilter(id);
  }

  settings(): UISettings {
    const settings = normalizeUISettings(null);
    for (const { key, fields } of SETTINGS_GROUPS) {
      let group: UISettings | undefined;
      const load = () => {
        return (group ??= normalizeUISettings(this.repo.readSetting(key)));
      };
      for (const field of fields)
        deferField(settings, field, () => load()[field]);
    }
    deferField(settings, 'lastModalTab', () => {
      return normalizeUISettings({
        lastModalTab: this.repo.readSetting('lastModalTab'),
      }).lastModalTab;
    });
    return settings;
  }

  saveSettings(next: UISettings, previous?: UISettings): void {
    for (const { key, fields } of SETTINGS_GROUPS) {
      if (fields.some((field) => !sameField(previous, next, field))) {
        this.repo.saveSetting(
          key,
          Object.fromEntries(fields.map((field) => [field, next[field]])),
        );
      }
    }
    if (!sameField(previous, next, 'lastModalTab'))
      this.repo.saveSetting('lastModalTab', next.lastModalTab);
  }
}
