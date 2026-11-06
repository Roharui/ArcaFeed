import $ from 'jquery';
import {
  buildFilterPredicate,
  extractArticleHref,
  extractArticleRows,
} from '@/feature/filter';
import { fetchUrl } from '@/utils/fetch';
import { appendSearchParam } from '@/utils/url';
import type { ArticleFilterImpl } from '@/types';

function normalizeUrl(pageUrl: string): string {
  if (!pageUrl.startsWith('http')) return pageUrl;
  const u = new URL(pageUrl);
  return `${u.pathname}${u.search}`;
}

async function fetchAndParse(
  url: string,
): Promise<{ $html: JQuery<HTMLElement> }> {
  const res = await fetchUrl(url);
  return {
    $html: $(
      new DOMParser().parseFromString(res.responseText, 'text/html')
        .documentElement,
    ),
  };
}

function extractNextPageUrl(
  $html: JQuery<HTMLElement>,
  basePath: string,
): string | null {
  const nextLink = $html
    .find('.page-item.active')
    .next()
    .find('a')
    .attr('href');
  return nextLink
    ? nextLink.startsWith('?')
      ? `${basePath}${nextLink}`
      : nextLink
    : null;
}

const MAX_PAGES = 10;

interface ListingOptions {
  url: string;
  basePath: string;
  filter?: ArticleFilterImpl | undefined;
  existingUrls?: ReadonlySet<string> | undefined;
  isCurrent?: () => boolean;
  continueSearch?: (() => Promise<boolean>) | undefined;
}

/** Shared pagination, loop detection and deduplication for every article listing. */
export async function* fetchListingPages({
  url: initialUrl,
  basePath,
  filter,
  existingUrls,
  isCurrent = () => true,
  continueSearch,
}: ListingOptions): AsyncGenerator<string[]> {
  let nextUrl: string | null = withBestMode(initialUrl, filter);
  const seen = new Set<string>();
  const visitedPages = new Set<string>();

  for (let page = 0; nextUrl; page++) {
    if (!isCurrent()) return;
    const url = normalizeUrl(nextUrl);
    if (visitedPages.has(url)) return;
    // Approval is requested once; subsequent pages continue until the consumer stops.
    if (page === MAX_PAGES) {
      if (!(await continueSearch?.()) || !isCurrent()) return;
    }
    visitedPages.add(url);
    const { $html } = await fetchAndParse(url);
    if (!isCurrent()) return;

    const links = extractLinks($html, filter, existingUrls, seen);
    for (const link of links) seen.add(link);
    yield links;

    nextUrl = extractNextPageUrl($html, basePath);
  }
}

/**
 * Append ?mode=best if the filter has onlyBest enabled.
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
  return `${path}${appendSearchParam(query, 'mode', 'best')}${fragment}`;
}

/**
 * Extract filtered article hrefs from parsed HTML.
 * Shared by default channel fetch and reusable by special channel handlers.
 */
export function extractLinks(
  $html: JQuery<HTMLElement>,
  filter?: ArticleFilterImpl,
  existingUrls?: ReadonlySet<string>,
  additionalUrls?: ReadonlySet<string>,
): string[] {
  const $rows = extractArticleRows($html);
  const predicate = filter ? buildFilterPredicate(filter) : () => true;

  const seen = new Set<string>();
  const links: string[] = [];
  $rows.each((_, ele) => {
    if (!predicate(ele)) return;
    const href = extractArticleHref($(ele));
    if (
      !href ||
      existingUrls?.has(href) ||
      additionalUrls?.has(href) ||
      seen.has(href)
    )
      return;
    seen.add(href);
    links.push(href);
  });
  return links;
}
