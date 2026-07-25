import $ from 'jquery';

import {
  buildFilterPredicate,
  extractArticleHref,
  extractArticleRows,
  filterLink,
} from '@/feature/filter';
import { fetchUrl } from '@/utils/fetch';
import { shuffle } from '@/utils/func';
import { getArticleId } from '@/utils/regex';
import { mergeSearchQuery } from '@/utils/url';
import { showToast } from '@/utils/toast';

import type { ArticleFilterImpl } from '@/types';
import type { VaultAdapter } from '@/vault';

const MAX_PAGES = 10;
const HOME_SERIES_PAGES_PER_BATCH = 1;

interface ChannelArticleBatch {
  links: string[];
  cursor: number;
  exhausted: boolean;
}

let activeLoaderRequests = 0;

function getLoader(): JQuery<HTMLElement> {
  let $loader = $('#arcafeed-fetch-loader');
  if ($loader.length === 0) {
    $loader = $('<div>', {
      id: 'arcafeed-fetch-loader',
      class: 'arcafeed-fetch-loader',
      role: 'status',
      'aria-label': '게시글을 불러오는 중',
      'aria-live': 'polite',
      'aria-hidden': 'true',
    });
    $('body').append($loader);
  }
  return $loader;
}

function showFetchLoader(): void {
  activeLoaderRequests += 1;
  getLoader().addClass('active').attr('aria-hidden', 'false');
}

function hideFetchLoader(): void {
  activeLoaderRequests = Math.max(0, activeLoaderRequests - 1);
  if (activeLoaderRequests === 0) {
    getLoader().removeClass('active').attr('aria-hidden', 'true');
  }
}

function debug(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[ArcaFeed] ${message}`);
  }
}

function buildPageUrl(p: VaultAdapter, articleId: string): string {
  if (p.isCurrentMode('SCRAP')) {
    return `/u/scrap_list${p.searchQuery}`;
  }

  const channelPath = `/b/${p.href.channelId}`;
  const path = articleId ? `${channelPath}/${articleId}` : channelPath;
  return mergeSearchQuery(path, p.searchQuery);
}

function normalizePageUrl(pageUrl: string): string {
  const url = new URL(pageUrl, window.location.origin);
  return `${url.pathname}${url.search}`;
}

async function fetchAndParse(url: string): Promise<JQuery<HTMLElement>> {
  const { responseText } = await fetchUrl(url);
  return $(responseText);
}

function extractNextPageUrl(
  $html: JQuery<HTMLElement>,
  basePath: string,
): string | null {
  const $articleList = $html.find('div.article-list').first();
  const href = $articleList
    .find('.page-item.active')
    .first()
    .next()
    .find('a')
    .attr('href');
  if (!href) return null;
  return normalizePageUrl(href.startsWith('?') ? `${basePath}${href}` : href);
}

function extractChannelPage(
  $html: JQuery<HTMLElement>,
  filter: ArticleFilterImpl | undefined,
  seen: Set<string>,
): { links: string[]; oldestArticleId: number } {
  const predicate = filter ? buildFilterPredicate(filter) : () => true;
  const links: string[] = [];
  let oldestArticleId = 0;

  extractArticleRows($html).each((_, element) => {
    const href = extractArticleHref($(element));
    if (!href) return;

    const articleId = Number.parseInt(getArticleId(href), 10);
    if (Number.isSafeInteger(articleId)) {
      oldestArticleId =
        oldestArticleId === 0
          ? articleId
          : Math.min(oldestArticleId, articleId);
    }

    if (!predicate(element) || seen.has(href)) return;
    seen.add(href);
    links.push(href);
  });

  return { links, oldestArticleId };
}

/**
 * Yield a deduplicated batch for each listing page. Visited URLs are tracked so
 * malformed pagination cannot loop until the request limit.
 */
async function* fetchArticlePages(
  p: VaultAdapter,
  articleId: string,
): AsyncGenerator<string[]> {
  const basePath = p.isCurrentMode('SCRAP')
    ? '/u/scrap_list'
    : `/b/${p.href.channelId}`;
  const seenLinks = new Set(p.articleList);
  const visitedUrls = new Set<string>();
  let nextUrl: string | null = buildPageUrl(p, articleId);

  const channelFilter = p.articleFilterConfig[p.href.channelId];
  if (channelFilter?.onlyBest && nextUrl) {
    nextUrl = mergeSearchQuery(nextUrl, '?mode=best');
  }

  for (let page = 0; page < MAX_PAGES && nextUrl; page += 1) {
    const url = normalizePageUrl(nextUrl);
    if (visitedUrls.has(url)) {
      debug(`Pagination cycle stopped at ${url}`);
      return;
    }
    visitedUrls.add(url);

    debug(`Fetching article page: ${url}`);
    const $html = await fetchAndParse(url);
    const links = filterLink(p, false, $html).filter((link) => {
      if (seenLinks.has(link)) return false;
      seenLinks.add(link);
      return true;
    });

    yield links;
    nextUrl = extractNextPageUrl($html, basePath);
  }
}

async function fetchFirstBatch(
  p: VaultAdapter,
  articleId: string,
): Promise<number> {
  showFetchLoader();
  try {
    for await (const links of fetchArticlePages(p, articleId)) {
      if (links.length > 0) {
        return p.appendArticleLinks(links);
      }
    }
    showToast('다음 게시글을 찾지 못했습니다.');
    return 0;
  } catch (error) {
    console.error('[ArcaFeed] Failed to fetch articles.', error);
    showToast('게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    return 0;
  } finally {
    hideFetchLoader();
  }
}

async function fetchAllBatches(
  p: VaultAdapter,
  articleId: string,
): Promise<number> {
  showFetchLoader();
  let added = 0;
  try {
    for await (const links of fetchArticlePages(p, articleId)) {
      added += p.appendArticleLinks(links);
    }

    if (p.articleList.length > 1) {
      p.articleList = shuffle([...p.articleList]);
    }
    if (added === 0) {
      showToast('시리즈로 열 게시글을 찾지 못했습니다.');
    }
    return added;
  } catch (error) {
    console.error('[ArcaFeed] Failed to fetch the article series.', error);
    showToast(
      added > 0
        ? `${added}개 게시글만 불러왔습니다. 나머지는 다시 시도해 주세요.`
        : '시리즈 게시글을 불러오지 못했습니다.',
    );
    return added;
  } finally {
    hideFetchLoader();
  }
}

function openScrapSeriesArticle(p: VaultAdapter): void {
  const firstUrl = p.articleList[0];
  if (!firstUrl) return;

  p.activeIndex = 0;
  p.flushSave();
  window.location.replace(
    mergeSearchQuery(firstUrl, p.searchQuery, window.location.origin),
  );
}

async function fetchChannelArticleBatch(
  channelId: string,
  beforeArticleId = 0,
  filter?: ArticleFilterImpl,
  existingUrls: Set<string> = new Set(),
): Promise<ChannelArticleBatch> {
  const modeParam = filter?.onlyBest ? '?mode=best' : '';
  const basePath = `/b/${channelId}`;
  let nextUrl: string | null =
    beforeArticleId > 0
      ? `${basePath}/${beforeArticleId}${modeParam}`
      : `${basePath}${modeParam}`;
  const links: string[] = [];
  const seen = new Set(existingUrls);
  const visitedUrls = new Set<string>();
  let cursor = beforeArticleId;
  let exhausted = false;

  for (let page = 0; page < HOME_SERIES_PAGES_PER_BATCH && nextUrl; page += 1) {
    const url = normalizePageUrl(nextUrl);
    if (visitedUrls.has(url)) break;
    visitedUrls.add(url);

    debug(`Fetching channel page: ${url}`);
    const $html = await fetchAndParse(url);
    const pageResult = extractChannelPage($html, filter, seen);
    links.push(...pageResult.links);
    if (
      pageResult.oldestArticleId > 0 &&
      (cursor === 0 || pageResult.oldestArticleId < cursor)
    ) {
      cursor = pageResult.oldestArticleId;
    }

    nextUrl = extractNextPageUrl($html, basePath);
    exhausted = nextUrl === null;
  }

  if (cursor === beforeArticleId || cursor === 0) {
    exhausted = true;
  }

  return { links, cursor, exhausted };
}

export {
  HOME_SERIES_PAGES_PER_BATCH,
  MAX_PAGES,
  fetchArticlePages,
  fetchChannelArticleBatch,
  fetchFirstBatch,
  fetchAllBatches,
  hideFetchLoader,
  openScrapSeriesArticle,
  showFetchLoader,
};
export type { ChannelArticleBatch };
