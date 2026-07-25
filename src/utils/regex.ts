import type { HrefImpl } from '@/types';

const ARCA_ORIGIN = 'https://arca.live';

function parseUrl(href: string): URL | null {
  try {
    return new URL(href, ARCA_ORIGIN);
  } catch {
    return null;
  }
}

function getPathParts(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean);
}

function getArticleId(href: string): string {
  const url = parseUrl(href);
  if (!url) return '';
  const [section, , articleId, ...rest] = getPathParts(url);
  return section === 'b' && rest.length === 0 && /^\d+$/.test(articleId ?? '')
    ? (articleId ?? '')
    : '';
}

function parseHref(href: string = window.location.href): HrefImpl {
  const url = parseUrl(href);
  if (
    !url ||
    (url.hostname !== 'arca.live' && !url.hostname.endsWith('.arca.live'))
  ) {
    return {
      mode: 'OTHER',
      channelId: '',
      articleId: '',
      articleKey: '',
      search: '',
    };
  }

  const parts = getPathParts(url);
  const articleKey = url.searchParams.get('articleKey') ?? '';
  const common = { articleKey, search: url.search };

  if (
    parts.length === 3 &&
    parts[0] === 'b' &&
    parts[1] &&
    /^\d+$/.test(parts[2] ?? '')
  ) {
    return {
      mode: 'ARTICLE',
      channelId: parts[1],
      articleId: parts[2] ?? '',
      ...common,
    };
  }

  if (parts.length === 2 && parts[0] === 'b' && parts[1]) {
    return {
      mode: 'CHANNEL',
      channelId: parts[1],
      articleId: '',
      ...common,
    };
  }

  if (parts.length === 2 && parts[0] === 'u' && parts[1] === 'scrap_list') {
    return {
      mode: 'SCRAP',
      channelId: '',
      articleId: '',
      ...common,
    };
  }

  return {
    mode: parts.length === 0 ? 'HOME' : 'OTHER',
    channelId: '',
    articleId: '',
    ...common,
  };
}

function extractChannelId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  const [section, channelId] = getPathParts(parsed);
  return section === 'b' && channelId ? channelId : null;
}

export { getArticleId, parseHref, extractChannelId };
