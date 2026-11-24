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

function matchBoardPath(href: string): RegExpExecArray | null {
  return href.startsWith('/') && !href.includes('?') && !href.includes('#')
    ? boardRoute.exec(href)
    : null;
}

function parseResolvedHref(
  href: string,
  pathMatch: RegExpExecArray | null,
): HrefImpl {
  const url = pathMatch ? null : resolve(href);
  const match = pathMatch ?? (url && boardRoute.exec(url.pathname));
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

export function parseHref(href = window.location.href): HrefImpl {
  return parseResolvedHref(href, matchBoardPath(href));
}

export function getArticleId(href: string): string {
  const match = matchBoardPath(href);
  return match ? (match[2] ?? '') : parseResolvedHref(href, null).articleId;
}

export function extractChannelId(href: string): string | null {
  const match = matchBoardPath(href);
  return match ? match[1]! : parseResolvedHref(href, null).channelId || null;
}

export function normalizeArticlePath(href: string): string | null {
  if (articlePathPattern.test(href))
    return href.endsWith('/') ? href.slice(0, -1) : href;
  const url = resolve(href);
  return url && articlePathPattern.test(url.pathname)
    ? url.pathname.replace(/\/$/, '')
    : null;
}
