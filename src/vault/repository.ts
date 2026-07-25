/**
 * Storage Repository - abstracts localStorage access.
 * Separates persistence concerns from business logic (previously in Config class).
 */

const ARTICLE_KEY_CACHE_LIMIT = 5;
const CACHE_PRUNE_GRACE_MS = 60_000;
const RECENT_ARTICLE_KEYS_KEY = 'arcaFeed:recentArticleKeys';

export class StorageRepository {
  private storage: Storage;
  private now: () => number;

  constructor(storage: Storage = localStorage, now: () => number = Date.now) {
    this.storage = storage;
    this.now = now;
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.warn(`[StorageRepository] Unable to read "${key}".`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.storage.getItem(key) !== value) {
        this.storage.setItem(key, value);
      }
    } catch (error) {
      console.warn(`[StorageRepository] Unable to write "${key}".`, error);
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.warn(`[StorageRepository] Unable to remove "${key}".`, error);
    }
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

    const now = this.now();
    this.setItem(
      this.scopedKey(currentArticleKey, 'lastAccess'),
      now.toString(),
    );

    const storedRecentKeys = this.getJSON<unknown>(RECENT_ARTICLE_KEYS_KEY);
    const recentKeys = Array.isArray(storedRecentKeys)
      ? [
          ...new Set(
            storedRecentKeys.filter(
              (key): key is string => typeof key === 'string' && key !== '',
            ),
          ),
        ]
      : [];

    const knownKeys = new Set([currentArticleKey, ...recentKeys]);

    try {
      for (let index = 0; index < this.storage.length; index += 1) {
        const key = this.storage.key(index);
        const match = /^arcaFeed:([^:]+):/.exec(key ?? '');
        if (match?.[1]) knownKeys.add(match[1]);
      }

      const recentRank = new Map(
        recentKeys.map((articleKey, index) => [articleKey, index]),
      );
      const lastAccess = (articleKey: string): number => {
        const value = Number(
          this.storage.getItem(this.scopedKey(articleKey, 'lastAccess')),
        );
        return Number.isFinite(value) ? value : 0;
      };
      const orderedKeys = [...knownKeys].sort((left, right) => {
        if (left === currentArticleKey) return -1;
        if (right === currentArticleKey) return 1;
        return (
          lastAccess(right) - lastAccess(left) ||
          (recentRank.get(left) ?? Number.MAX_SAFE_INTEGER) -
            (recentRank.get(right) ?? Number.MAX_SAFE_INTEGER)
        );
      });
      const retainedKeys = orderedKeys.slice(0, ARTICLE_KEY_CACHE_LIMIT);

      for (const expiredKey of orderedKeys.slice(ARTICLE_KEY_CACHE_LIMIT)) {
        if (now - lastAccess(expiredKey) < CACHE_PRUNE_GRACE_MS) {
          retainedKeys.push(expiredKey);
          continue;
        }

        const prefix = `arcaFeed:${expiredKey}:`;
        for (let index = this.storage.length - 1; index >= 0; index -= 1) {
          const key = this.storage.key(index);
          if (key?.startsWith(prefix)) this.storage.removeItem(key);
        }
      }

      this.setJSON(RECENT_ARTICLE_KEYS_KEY, retainedKeys);
    } catch (error) {
      console.warn('[StorageRepository] Unable to prune caches.', error);
      this.setJSON(RECENT_ARTICLE_KEYS_KEY, [
        currentArticleKey,
        ...recentKeys.filter((key) => key !== currentArticleKey),
      ]);
    }
  }
}

export { ARTICLE_KEY_CACHE_LIMIT, CACHE_PRUNE_GRACE_MS };
