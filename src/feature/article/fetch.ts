import $ from 'jquery';

import { filterLink } from '@/feature';
import { fetchUrl } from '@/utils/fetch';
import { showToast } from '@/utils/toast';

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

function showFetchLoader(): void {
  getLoader().addClass('active');
}

function hideFetchLoader(): void {
  getLoader().removeClass('active');
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
  return { $html: $(res.responseText) };
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
  const basePath = p.isCurrentMode('SCRAP') ? '/u/scrap_list' : articleId;
  let nextUrl: string | null = buildPageUrl(p, articleId);

  for (let page = 0; page <= MAX_PAGES && nextUrl; page++) {
    const url = normalizeUrl(nextUrl);

    console.log(`Fetching article page: ${url}`);
    const { $html } = await fetchAndParse(url);

    const newLinks = filterLink(p, false, $html).filter(
      (link) => !p.articleList.includes(link),
    );

    yield newLinks;

    nextUrl = extractNextPageUrl($html, basePath);
    if (!nextUrl) {
      console.log('NO ARTICLE PAGE LINK FOUND');
      return;
    }

    if (newLinks.length === 0) {
      console.log(`No articles found, trying next page: ${nextUrl}`);
    }
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
  try {
    for await (const links of fetchArticlePages(p, articleId)) {
      if (links.length > 0) {
        console.log(`Fetching Complete`);
        p.articleList.push(...links);
        return;
      }
    }
    showToast('다음 게시글 탐색에 실패했습니다.');
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
  try {
    for await (const links of fetchArticlePages(p, articleId)) {
      p.articleList.push(...links);
    }

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

export {
  fetchArticlePages,
  fetchFirstBatch,
  fetchAllBatches,
  openScrapSeriesArticle,
};
