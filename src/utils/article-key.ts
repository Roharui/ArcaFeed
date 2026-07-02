/**
 * Article Key generation and manipulation utilities.
 * Deduplicates logic previously scattered across feature/article/link.ts and feature/series.ts.
 */

export function createArticleKey(): string {
  return (
    window.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) ||
    Math.random().toString(36).slice(2, 10)
  );
}

export function getCurrentArticleKey(): string {
  return new URL(window.location.href).searchParams.get('articleKey') || '';
}

export function withArticleKey(href: string, articleKey: string): string {
  if (!articleKey) {
    return href;
  }

  const url = new URL(href, window.location.origin);
  url.searchParams.set('articleKey', articleKey);

  return `${url.pathname}${url.search}`;
}

export function getStorageKey(articleKey: string, key: string): string {
  return `arcaFeed:${articleKey}:${key}`;
}
