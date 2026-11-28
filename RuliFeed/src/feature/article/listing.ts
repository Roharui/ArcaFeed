import {
  buildFilterPredicate,
  extractArticleHref,
  extractArticleRows,
} from '@/feature/filter';
import { fetchUrl } from '@feed/core/utils/fetch';
import { appendSearchParam } from '@feed/core/utils/url';
import { BOARD_PATH, extractChannelId } from '@/utils/regex';
import type { ArticleFilterImpl } from '@/types';

function normalizeUrl(pageUrl: string): string {
  if (!pageUrl.startsWith('http')) return pageUrl;
  const u = new URL(pageUrl);
  return `${u.pathname}${u.search}`;
}

export function extractNextPageUrl(
  html: ParentNode,
  basePath: string,
): string | null {
  const activeItems = html.querySelectorAll('#board_list .btn_num.active');
  for (let index = 0; index < activeItems.length; index++) {
    const active = activeItems[index]!;
    const link = active.nextElementSibling;
    if (!link?.matches('a.btn_num, a.btn_next')) continue;
    const href = link.getAttribute('href');
    return href
      ? normalizeUrl(href.startsWith('?') ? basePath + href : href)
      : null;
  }
  return null;
}

const MAX_PAGES = 10;

interface ListingOptions {
  url: string;
  basePath: string;
  filter?: ArticleFilterImpl | undefined;
  existingUrls?: ReadonlySet<string> | undefined;
  isCurrent?: () => boolean;
  continueSearch?: (() => Promise<boolean>) | undefined;
  onPageLoaded?:
    | ((nextUrl: string | null, pageUrl: string) => void)
    | undefined;
}

/** Shared pagination, loop detection and deduplication for every article listing. */
export async function* fetchListingPages({
  url: initialUrl,
  basePath,
  filter,
  existingUrls,
  isCurrent = () => true,
  continueSearch,
  onPageLoaded,
}: ListingOptions): AsyncGenerator<string[]> {
  let nextUrl: string | null = withBestMode(initialUrl, filter);
  const seen = new Set<string>();
  const visitedPages = new Set<string>();
  const channelId = BOARD_PATH.test(basePath)
    ? extractChannelId(basePath)
    : null;

  for (let page = 0; nextUrl; page++) {
    if (!isCurrent()) return;
    const url = normalizeUrl(nextUrl);
    if (visitedPages.has(url)) return;
    // Approval is requested once; subsequent pages continue until the consumer stops.
    if (page === MAX_PAGES) {
      if (!(await continueSearch?.()) || !isCurrent()) return;
    }
    visitedPages.add(url);
    const result = await fetchListingPage(
      url,
      isCurrent,
      basePath,
      filter,
      existingUrls,
      seen,
      channelId,
    );
    if (!result || !isCurrent()) return;
    nextUrl = result.next;
    onPageLoaded?.(nextUrl, url);
    yield result.links;
  }
}

async function fetchListingPage(
  url: string,
  isCurrent: () => boolean,
  basePath: string,
  filter: ArticleFilterImpl | undefined,
  existingUrls: ReadonlySet<string> | undefined,
  seen: Set<string>,
  channelId: string | null,
): Promise<{ links: string[]; next: string | null } | undefined> {
  const { responseText } = await fetchUrl(url);
  if (!isCurrent()) return;
  const html = new DOMParser().parseFromString(responseText, 'text/html');
  const links = collectLinks(
    html,
    filter,
    existingUrls,
    seen,
    undefined,
    channelId,
  );
  return { links, next: extractNextPageUrl(html, basePath) };
}

/**
 * Append ?view_best=1 if the filter has onlyBest enabled.
 * Safe to call on URLs that already have query params.
 */
export function withBestMode(url: string, filter?: ArticleFilterImpl): string {
  if (!filter?.onlyBest) return url;
  const hashIndex = url.indexOf('#');
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = base.indexOf('?');
  const path = queryIndex === -1 ? base : base.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : base.slice(queryIndex);
  return `${path}${appendSearchParam(query, 'view_best', '1')}${fragment}`;
}

/**
 * Extract filtered article hrefs from parsed HTML.
 * Shared by default channel fetch and reusable by special channel handlers.
 */
export function extractLinks(
  html: ParentNode,
  filter?: ArticleFilterImpl,
  existingUrls?: ReadonlySet<string>,
  additionalUrls?: ReadonlySet<string>,
): string[] {
  return collectLinks(html, filter, existingUrls, new Set(), additionalUrls);
}

function collectLinks(
  html: ParentNode,
  filter: ArticleFilterImpl | undefined,
  existingUrls: ReadonlySet<string> | undefined,
  seen: Set<string>,
  additionalUrls?: ReadonlySet<string>,
  channelId?: string | null,
): string[] {
  const predicate = filter && buildFilterPredicate(filter);
  const links: string[] = [];
  for (const row of extractArticleRows(html)) {
    if (predicate && !predicate(row)) continue;
    const href = extractArticleHref(row);
    if (
      !href ||
      existingUrls?.has(href) ||
      additionalUrls?.has(href) ||
      seen.has(href) ||
      (channelId && extractChannelId(href) !== channelId)
    )
      continue;
    seen.add(href);
    links.push(href);
  }
  return links;
}
