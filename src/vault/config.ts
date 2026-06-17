import type { ArticleFilterConfigImpl } from '@/types';

const ARTICLE_KEY_CACHE_LIMIT = 5;
const ARTICLE_FILTER_CONFIG_STORAGE_KEY = 'arcaFeed:articleFilterConfig';
const RECENT_ARTICLE_KEYS_STORAGE_KEY = 'arcaFeed:recentArticleKeys';

class Config {
  articleKey: string = '';

  articleList: string[] = [];

  articleFilterConfig: ArticleFilterConfigImpl = {};

  isSeriesMode: boolean = false;

  searchQuery: string = '';
  lastActiveIndex: number = -1;

  constructor() {
    this.loadConfig();
  }

  private ensureArticleKey(): string {
    const currentUrl = new URL(window.location.href);
    const existingArticleKey = currentUrl.searchParams.get('articleKey');

    if (existingArticleKey) {
      return existingArticleKey;
    }

    const generatedArticleKey =
      window.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) ||
      Math.random().toString(36).slice(2, 10);

    currentUrl.searchParams.set('articleKey', generatedArticleKey);
    window.history.replaceState({}, '', currentUrl.toString());

    return generatedArticleKey;
  }

  protected getStorageKey(key: string): string {
    return `arcaFeed:${this.articleKey}:${key}`;
  }

  protected getStorageItem(key: string): string | null {
    return localStorage.getItem(this.getStorageKey(key));
  }

  protected setStorageItem(key: string, value: string): void {
    localStorage.setItem(this.getStorageKey(key), value);
  }

  private getRecentArticleKeys(): string[] {
    const storedValue = localStorage.getItem(RECENT_ARTICLE_KEYS_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(storedValue);

      return Array.isArray(parsedValue)
        ? parsedValue.filter((key): key is string => typeof key === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private saveRecentArticleKeys(articleKeys: string[]): void {
    localStorage.setItem(
      RECENT_ARTICLE_KEYS_STORAGE_KEY,
      JSON.stringify(articleKeys),
    );
  }

  private pruneArticleKeyCaches(): void {
    const recentArticleKeys = this.getRecentArticleKeys();
    const nextArticleKeys = [
      this.articleKey,
      ...recentArticleKeys.filter((key) => key !== this.articleKey),
    ].slice(0, ARTICLE_KEY_CACHE_LIMIT);

    const expiredArticleKeys = recentArticleKeys.filter(
      (key) => !nextArticleKeys.includes(key),
    );

    expiredArticleKeys.forEach((expiredArticleKey) => {
      const expiredPrefix = `arcaFeed:${expiredArticleKey}:`;

      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const storageKey = localStorage.key(index);

        if (storageKey && storageKey.startsWith(expiredPrefix)) {
          localStorage.removeItem(storageKey);
        }
      }
    });

    this.saveRecentArticleKeys(nextArticleKeys);
  }

  resetArticleList() {
    this.articleList = [];
  }

  loadConfig(): void {
    this.articleKey = this.ensureArticleKey();

    const articleFilterConfigStr =
      localStorage.getItem(ARTICLE_FILTER_CONFIG_STORAGE_KEY) ||
      localStorage.getItem(this.getStorageKey('articleFilterConfig'));
    this.articleFilterConfig = articleFilterConfigStr
      ? JSON.parse(articleFilterConfigStr)
      : {};

    const articleListStr = this.getStorageItem('articleList');
    this.articleList = articleListStr ? JSON.parse(articleListStr) : [];

    this.isSeriesMode = this.getStorageItem('seriesMode') === 'true';

    this.searchQuery = this.getStorageItem('searchQuery') || '';
    this.lastActiveIndex = parseInt(
      this.getStorageItem('lastActiveIndex') || '-1',
    );

    this.pruneArticleKeyCaches();
  }

  saveConfig(): void {
    localStorage.setItem(
      ARTICLE_FILTER_CONFIG_STORAGE_KEY,
      JSON.stringify(this.articleFilterConfig),
    );

    this.setStorageItem('articleList', JSON.stringify(this.articleList));

    this.setStorageItem('seriesMode', this.isSeriesMode.toString());
    this.setStorageItem('searchQuery', this.searchQuery);
    this.pruneArticleKeyCaches();
  }
}

export { Config };
