/**
 * Storage Repository - abstracts localStorage access.
 * Separates persistence concerns from business logic (previously in Config class).
 */

const ARTICLE_KEY_CACHE_LIMIT = 5;
const RECENT_ARTICLE_KEYS_KEY = 'arcaFeed:recentArticleKeys';

export class StorageRepository {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  getJSON<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJSON<T>(key: string, value: T): void {
    this.setItem(key, JSON.stringify(value));
  }

  /**
   * Build a namespaced key for a given articleKey.
   */
  scopedKey(articleKey: string, subKey: string): string {
    return `arcaFeed:${articleKey}:${subKey}`;
  }

  /**
   * Prune expired article key caches, keeping only the most recent N.
   */
  pruneArticleKeyCaches(currentArticleKey: string): void {
    if (!currentArticleKey) return;

    const recentKeys = this.getJSON<string[]>(RECENT_ARTICLE_KEYS_KEY) || [];

    const nextKeys = [
      currentArticleKey,
      ...recentKeys.filter((key) => key !== currentArticleKey),
    ].slice(0, ARTICLE_KEY_CACHE_LIMIT);

    const expiredKeys = recentKeys.filter((key) => !nextKeys.includes(key));

    for (const expiredKey of expiredKeys) {
      const prefix = `arcaFeed:${expiredKey}:`;

      for (let i = this.storage.length - 1; i >= 0; i--) {
        const key = this.storage.key(i);
        if (key && key.startsWith(prefix)) {
          this.storage.removeItem(key);
        }
      }
    }

    this.setJSON(RECENT_ARTICLE_KEYS_KEY, nextKeys);
  }
}
