export const READING_HISTORY_KEY = 'arcaFeed:readingHistory';
export const READING_LIST_PREFIX = 'arcaFeed:readingList:';
export const readingListKey = (id: string): string =>
  READING_LIST_PREFIX + encodeURIComponent(id);
export const READING_PROGRESS_KEY = 'arcaFeed:readingProgress';
export const SESSION_LIMIT = 20;
export const SESSION_ARTICLE_LIMIT = 2000;
export const SESSION_TOTAL_ARTICLE_LIMIT = 5000;
export const ARTICLE_KEY_CACHE_LIMIT = 5;
export const RECENT_ARTICLE_KEYS_KEY = 'arcaFeed:recentArticleKeys';
