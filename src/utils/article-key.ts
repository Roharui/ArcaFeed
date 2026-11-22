import { BOARD_PATH, extractChannelId, normalizeArticlePath } from './regex';

/**
 * Article Key generation and tab-scoped session persistence.
 * Keeps articleKey in history.state + sessionStorage instead of URL query params,
 * with a short-lived same-origin handoff for multi-WebView browsers that isolate
 * sessionStorage and history.state across navigations.
 */

export const TAB_ARTICLE_KEY_STORAGE = 'rulifeed:articleKey';
export const HANDOFF_ARTICLE_KEY_STORAGE = 'rulifeed:articleKeyHandoff';
export const HISTORY_ARTICLE_KEY_FIELD = 'ruliFeedArticleKey';

const HANDOFF_TTL_MS = 30_000;
const MAX_HANDOFFS = 10;

interface ArticleKeyHandoff {
  articleKey: string;
  targetPath?: string;
  referrer?: string;
  channelId?: string;
  createdAt: number;
}

export function createArticleKey(): string {
  return (
    window.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) ||
    Math.random().toString(36).slice(2, 10)
  );
}

function readUrlArticleKey(): string {
  try {
    return new URL(window.location.href).searchParams.get('articleKey') || '';
  } catch {
    return '';
  }
}

function readHistoryArticleKey(): string {
  try {
    const state = window.history?.state as Record<string, unknown> | null;
    const key = state?.[HISTORY_ARTICLE_KEY_FIELD];
    return typeof key === 'string' ? key : '';
  } catch {
    return '';
  }
}

function readSessionArticleKey(): string {
  try {
    return typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(TAB_ARTICLE_KEY_STORAGE) || ''
      : '';
  } catch {
    return '';
  }
}

function writeSessionArticleKey(articleKey: string): void {
  if (!articleKey) return;
  try {
    if (typeof sessionStorage !== 'undefined')
      sessionStorage.setItem(TAB_ARTICLE_KEY_STORAGE, articleKey);
  } catch {
    // Private browsing or blocked storage can prevent writing sessionStorage.
  }
}

function writeHistoryArticleKey(
  articleKey: string,
  stripUrlParam: boolean,
): void {
  if (!articleKey || typeof window.history?.replaceState !== 'function') return;
  try {
    const currentState = window.history.state;
    const nextState =
      currentState && typeof currentState === 'object'
        ? {
            ...(currentState as Record<string, unknown>),
            [HISTORY_ARTICLE_KEY_FIELD]: articleKey,
          }
        : { [HISTORY_ARTICLE_KEY_FIELD]: articleKey };
    if (stripUrlParam) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('articleKey')) {
        url.searchParams.delete('articleKey');
        window.history.replaceState(nextState, '', url.toString());
        return;
      }
    }
    window.history.replaceState(nextState, '');
  } catch {
    // Ignore history API restrictions in opaque origins or test mocks.
  }
}

function normalizeReferrer(href: string): string {
  if (!href) return '';
  try {
    const base = window.location?.origin || 'https://bbs.ruliweb.com';
    const url = new URL(href, base);
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return '';
  }
}

function readHandoffs(now: number): ArticleKeyHandoff[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(HANDOFF_ARTICLE_KEY_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ArticleKeyHandoff =>
        !!entry &&
        typeof entry === 'object' &&
        typeof entry.articleKey === 'string' &&
        entry.articleKey.length > 0 &&
        typeof entry.createdAt === 'number' &&
        entry.createdAt <= now + 5_000 &&
        now - entry.createdAt <= HANDOFF_TTL_MS,
    );
  } catch {
    return [];
  }
}

function writeHandoffs(entries: ArticleKeyHandoff[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (entries.length === 0) {
      localStorage.removeItem(HANDOFF_ARTICLE_KEY_STORAGE);
      return;
    }
    localStorage.setItem(
      HANDOFF_ARTICLE_KEY_STORAGE,
      JSON.stringify(entries.slice(-MAX_HANDOFFS)),
    );
  } catch {
    // Private browsing or blocked storage can prevent writing localStorage.
  }
}

function findHandoffArticleKey(consume: boolean): string {
  const currentHref = window.location?.href ?? '';
  const currentPath = normalizeArticlePath(currentHref);
  if (!currentPath) return '';

  const now = Date.now();
  const entries = readHandoffs(now);
  if (!entries.length) return '';

  const currentReferrer =
    typeof document !== 'undefined' && document.referrer
      ? normalizeReferrer(document.referrer)
      : '';
  const currentChannelId = extractChannelId(currentHref) ?? '';

  const findLastIndex = (predicate: (entry: ArticleKeyHandoff) => boolean) => {
    for (let index = entries.length - 1; index >= 0; index--) {
      if (predicate(entries[index]!)) return index;
    }
    return -1;
  };

  let matchedIndex = -1;
  if (currentReferrer) {
    matchedIndex = findLastIndex(
      (entry) =>
        entry.targetPath === currentPath && entry.referrer === currentReferrer,
    );
  }
  if (matchedIndex === -1) {
    matchedIndex = findLastIndex((entry) => entry.targetPath === currentPath);
  }
  if (matchedIndex === -1 && currentReferrer) {
    matchedIndex = findLastIndex(
      (entry) =>
        !entry.targetPath &&
        entry.referrer === currentReferrer &&
        (!entry.channelId || entry.channelId === currentChannelId),
    );
  }
  if (matchedIndex === -1) return '';

  const matched = entries[matchedIndex]!;
  if (consume && matched.targetPath) {
    entries.splice(matchedIndex, 1);
    writeHandoffs(entries);
  }
  return matched.articleKey;
}

export function setTabArticleKey(articleKey: string): void {
  if (!articleKey) return;
  writeSessionArticleKey(articleKey);
  writeHistoryArticleKey(articleKey, false);
}

export function handoffTabArticleKey(
  articleKey: string,
  targetPath?: string,
): void {
  if (!articleKey) return;
  setTabArticleKey(articleKey);
  const now = Date.now();
  const normalizedTarget = targetPath
    ? (normalizeArticlePath(targetPath) ?? undefined)
    : undefined;
  const referrer = normalizeReferrer(window.location?.href ?? '');
  const channelId = extractChannelId(window.location?.href ?? '') ?? undefined;
  const next: ArticleKeyHandoff = {
    articleKey,
    ...(normalizedTarget ? { targetPath: normalizedTarget } : {}),
    ...(referrer ? { referrer } : {}),
    ...(channelId ? { channelId } : {}),
    createdAt: now,
  };
  const existing = readHandoffs(now).filter(
    (entry) =>
      entry.targetPath !== next.targetPath || entry.referrer !== next.referrer,
  );
  existing.push(next);
  writeHandoffs(existing);
}

export function getCurrentArticleKey(): string {
  return (
    readUrlArticleKey() ||
    readHistoryArticleKey() ||
    readSessionArticleKey() ||
    findHandoffArticleKey(false) ||
    ''
  );
}

export function ensureTabArticleKey(): string {
  const urlKey = readUrlArticleKey();
  if (urlKey) {
    writeSessionArticleKey(urlKey);
    writeHistoryArticleKey(urlKey, true);
    return urlKey;
  }

  let pathname = '';
  try {
    pathname = new URL(window.location.href).pathname;
  } catch {
    return '';
  }
  if (!BOARD_PATH.test(pathname)) return '';

  const historyKey = readHistoryArticleKey();
  if (historyKey) {
    writeSessionArticleKey(historyKey);
    return historyKey;
  }

  const isArticlePage = /\/read\/\d+\/?$/i.test(pathname);
  if (isArticlePage) {
    const sessionKey = readSessionArticleKey();
    if (sessionKey) {
      writeHistoryArticleKey(sessionKey, false);
      return sessionKey;
    }
    const handoffKey = findHandoffArticleKey(true);
    if (handoffKey) {
      setTabArticleKey(handoffKey);
      return handoffKey;
    }
  }

  const generatedKey = createArticleKey();
  setTabArticleKey(generatedKey);
  return generatedKey;
}

export function withArticleKey(href: string, articleKey: string): string {
  if (!articleKey) {
    return href;
  }

  const url = new URL(href, window.location.origin);
  url.searchParams.set('articleKey', articleKey);

  return `${url.pathname}${url.search}`;
}
