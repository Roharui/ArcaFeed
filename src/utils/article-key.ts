import { BOARD_PATH } from './regex';

/**
 * Article Key generation and tab-scoped session persistence.
 * Keeps articleKey in history.state + sessionStorage instead of URL query params.
 */

export const TAB_ARTICLE_KEY_STORAGE = 'rulifeed:articleKey';
export const HISTORY_ARTICLE_KEY_FIELD = 'ruliFeedArticleKey';

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

export function setTabArticleKey(articleKey: string): void {
  if (!articleKey) return;
  writeSessionArticleKey(articleKey);
  writeHistoryArticleKey(articleKey, false);
}

export function getCurrentArticleKey(): string {
  return (
    readUrlArticleKey() ||
    readHistoryArticleKey() ||
    readSessionArticleKey() ||
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
