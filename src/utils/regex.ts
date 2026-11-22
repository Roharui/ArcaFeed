import type { HrefImpl } from '@/types';

export const BOARD_PATH =
  /^\/(?:(?:[a-z0-9_-]+\/)*board\/\d+)(?:\/read\/\d+)?\/?$/i;
const articlePathPattern =
  /^\/(?:[a-z0-9_-]+\/)*board\/\d+\/read\/\d+\/?(?![\s\S])/i;
const boardRoute = /^\/((?:[a-z0-9_-]+\/)*board\/\d+)(?:\/read\/(\d+))?\/?$/i;

export function isRuliwebOrigin(url: URL): boolean {
  return (
    url.origin === 'https://bbs.ruliweb.com' ||
    url.origin === 'https://m.ruliweb.com'
  );
}

function resolve(href: string): URL | null {
  try {
    const url = new URL(href, 'https://bbs.ruliweb.com');
    return isRuliwebOrigin(url) ? url : null;
  } catch {
    return null;
  }
}

export function parseHref(href = window.location.href): HrefImpl {
  const url = resolve(href);
  const match = url?.pathname.match(boardRoute);
  const articleId = match?.[2] ?? '';
  return {
    mode: match
      ? articleId
        ? 'ARTICLE'
        : 'CHANNEL'
      : url?.pathname === '/'
        ? 'HOME'
        : 'OTHER',
    channelId: match?.[1] ?? '',
    articleId,
    articleKey: url?.searchParams.get('articleKey') ?? '',
    search: url?.search ?? '',
  };
}

export function getArticleId(href: string): string {
  return parseHref(href).articleId;
}

export function extractChannelId(href: string): string | null {
  return parseHref(href).channelId || null;
}

export function normalizeArticlePath(href: string): string | null {
  if (articlePathPattern.test(href))
    return href.endsWith('/') ? href.slice(0, -1) : href;
  const url = resolve(href);
  return url && articlePathPattern.test(url.pathname)
    ? url.pathname.replace(/\/$/, '')
    : null;
}
