import $ from 'jquery';

import {
  buildFilterPredicate,
  extractArticleHref,
  extractArticleRows,
} from '@/feature/filter';
import { fetchUrl } from '@/utils/fetch';
import { shuffle } from '@/utils/func';
import { appendSearchParam } from '@/utils/url';
import { showToast } from '@/utils/toast';
import { captureArticleSession } from '@/vault/article-session';

import type { ArticleFilterImpl } from '@/types';
import type { VaultAdapter } from '@/vault';

// ── Loading indicator ──────────────────────────────────

function getLoader(): JQuery<HTMLElement> {
  let $loader = $('#arcafeed-fetch-loader');
  if (!$loader.length) {
    $loader = $('<div id="arcafeed-fetch-loader" class="fetch-loader"></div>');
    $('body').append($loader);
  }
  return $loader;
}

let activeLoads = 0;

function showFetchLoader(): void {
  if (activeLoads++ === 0) getLoader().addClass('active');
}

function hideFetchLoader(): void {
  activeLoads = Math.max(0, activeLoads - 1);
  if (activeLoads === 0) getLoader().removeClass('active');
}

// ── Helpers ────────────────────────────────────────────

function buildPageUrl(p: VaultAdapter, articleId: string): string {
  return p.isCurrentMode('SCRAP')
    ? `/u/scrap_list${p.searchQuery}`
    : `${articleId}${p.searchQuery}`;
}

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

function channelBasePath(channelId: string): string {
  return `/b/${channelId}`;
}

// ── Async Generator (core) ─────────────────────────────

const MAX_PAGES = 10;

/**
 * Yields batches of filtered article links from each paginated listing page.
 * The consumer decides when to stop by breaking out of the loop.
 */
async function* fetchArticlePages(
  p: VaultAdapter,
  articleId: string,
): AsyncGenerator<string[]> {
  const isCurrent = captureArticleSession(p);
  const basePath = p.isCurrentMode('SCRAP') ? '/u/scrap_list' : articleId;
  let nextUrl: string | null = buildPageUrl(p, articleId);

  const channelFilter = p.articleFilterConfig[p.href.channelId];
  const existingUrls = new Set(p.articleList);
  const visitedPages = new Set<string>();
  if (nextUrl) {
    nextUrl = withBestMode(nextUrl, channelFilter);
  }

  for (let page = 0; page < MAX_PAGES && nextUrl; page++) {
    if (!isCurrent()) return;
    const url = normalizeUrl(nextUrl);
    if (visitedPages.has(url)) return;
    visitedPages.add(url);
    const { $html } = await fetchAndParse(url);
    if (!isCurrent()) return;

    const newLinks = extractLinks($html, channelFilter, existingUrls);
    for (const link of newLinks) existingUrls.add(link);

    yield newLinks;

    nextUrl = extractNextPageUrl($html, basePath);
    if (!nextUrl) return;
  }
}

// ── Convenience wrappers ───────────────────────────────

/**
 * Fetch until the first page that yields results, then stop.
 * Shows a failure toast if no articles are found across all pages.
 */
async function fetchFirstBatch(
  p: VaultAdapter,
  articleId: string,
): Promise<void> {
  showFetchLoader();
  const isCurrent = captureArticleSession(p);
  try {
    for await (const links of fetchArticlePages(p, articleId)) {
      if (!isCurrent()) return;
      if (links.length > 0) {
        p.articleList = [...new Set([...p.articleList, ...links])];
        return;
      }
    }
    if (isCurrent()) showToast('다음 게시글 탐색에 실패했습니다.');
  } finally {
    hideFetchLoader();
  }
}

/**
 * Collect all article links across all available pages.
 * After exhaustion, opens the first scrap series article if in series mode.
 */
async function fetchAllBatches(
  p: VaultAdapter,
  articleId: string,
): Promise<void> {
  showFetchLoader();
  const isCurrent = captureArticleSession(p);
  try {
    const additions: string[] = [];
    for await (const links of fetchArticlePages(p, articleId)) {
      if (!isCurrent()) return;
      additions.push(...links);
    }
    if (!isCurrent()) return;
    const articles = [...new Set([...p.articleList, ...additions])];

    if (p.isShuffleMode) {
      shuffle(articles);
    }
    p.articleList = articles;

    if (p.isSeriesMode) {
      openScrapSeriesArticle(p);
    }
  } finally {
    hideFetchLoader();
  }
}

// ── Navigation ─────────────────────────────────────────

function openScrapSeriesArticle(p: VaultAdapter): void {
  const firstUrl = p.articleList[0];
  if (!firstUrl) return;

  p.activeIndex = 0;
  p.flushSave();

  const nextUrl = new URL(firstUrl, window.location.origin);
  nextUrl.search = p.searchQuery;

  if (p.articleKey) {
    nextUrl.searchParams.set('articleKey', p.articleKey);
  }

  window.location.replace(nextUrl.toString());
}

// ── Multi-channel fetch helpers ─────────────────────────

/**
 * Append ?mode=best if the filter has onlyBest enabled.
 * Safe to call on URLs that already have query params.
 */
export function withBestMode(url: string, filter?: ArticleFilterImpl): string {
  return filter?.onlyBest ? appendSearchParam(url, 'mode', 'best') : url;
}

/**
 * Extract filtered article hrefs from parsed HTML.
 * Shared by default channel fetch and reusable by special channel handlers.
 */
export function extractLinks(
  $html: JQuery<HTMLElement>,
  filter?: ArticleFilterImpl,
  existingUrls?: Set<string>,
): string[] {
  const $rows = extractArticleRows($html);
  const predicate = filter ? buildFilterPredicate(filter) : () => true;

  const seen = new Set<string>();
  const links: string[] = [];
  $rows.each((_, ele) => {
    if (!predicate(ele)) return;
    const href = extractArticleHref($(ele));
    if (!href || existingUrls?.has(href) || seen.has(href)) return;
    seen.add(href);
    links.push(href);
  });
  return links;
}

// ── Standard channel fetch (default /b/{channelId} pattern) ──

async function fetchChannelFirstPage(
  channelId: string,
  filter?: ArticleFilterImpl,
): Promise<string[]> {
  const url = withBestMode(channelBasePath(channelId), filter);
  const { $html } = await fetchAndParse(url);

  return extractLinks($html, filter);
}

async function fetchChannelArticles(
  channelId: string,
  filter?: ArticleFilterImpl,
  existingUrls?: Set<string>,
): Promise<string[]> {
  const basePath = channelBasePath(channelId);
  let nextUrl: string | null = withBestMode(basePath, filter);
  const results: string[] = [];
  const seen = new Set(existingUrls);
  const visitedPages = new Set<string>();

  for (let page = 0; page < MAX_PAGES && nextUrl; page++) {
    const url = normalizeUrl(nextUrl);
    if (visitedPages.has(url)) break;
    visitedPages.add(url);
    const { $html } = await fetchAndParse(url);

    const links = extractLinks($html, filter, seen);
    results.push(...links);
    for (const link of links) seen.add(link);

    nextUrl = extractNextPageUrl($html, basePath);
  }

  return results;
}

async function fetchChannelArticlesBefore(
  channelId: string,
  beforeArticleId: number,
  filter?: ArticleFilterImpl,
  existingUrls?: Set<string>,
): Promise<string[]> {
  const basePath = channelBasePath(channelId);
  let nextUrl: string | null = withBestMode(
    `${basePath}/${beforeArticleId}`,
    filter,
  );
  const results: string[] = [];
  const visitedPages = new Set<string>();

  for (let page = 0; page < MAX_PAGES && nextUrl; page++) {
    const url = normalizeUrl(nextUrl);
    if (visitedPages.has(url)) break;
    visitedPages.add(url);
    const { $html } = await fetchAndParse(url);

    const links = extractLinks($html, filter, existingUrls);
    results.push(...links);

    nextUrl = extractNextPageUrl($html, basePath);

    if (links.length > 0) break;
  }

  return results;
}

export {
  fetchArticlePages,
  fetchChannelArticlesBefore,
  fetchFirstBatch,
  fetchAllBatches,
  fetchChannelArticles,
  fetchChannelFirstPage,
  hideFetchLoader,
  openScrapSeriesArticle,
  showFetchLoader,
};
