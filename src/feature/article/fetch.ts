import $ from 'jquery';

import { filterLink } from '@/feature';
import { fetchUrl } from '@/utils/fetch';
import { showToast } from '@/utils/toast';

import type { VaultAdapter } from '@/vault';

// ── Helpers ────────────────────────────────────────────

function buildPageUrl(p: VaultAdapter, articleId: string): string {
  return p.isCurrentMode('SCRAP')
    ? `/u/scrap_list${p.searchQuery}`
    : `${articleId}${p.searchQuery}`;
}

function normalizeUrl(pageUrl: string): string {
  if (!pageUrl.startsWith('http')) return pageUrl;
  const parsed = new URL(pageUrl);
  return `${parsed.pathname}${parsed.search}`;
}

// ── Scraper ────────────────────────────────────────────

interface PageResult {
  nextUrl: string | null;
  $html: JQuery<HTMLElement>;
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
  if (!nextLink) return null;

  return nextLink.startsWith('?') ? `${basePath}${nextLink}` : nextLink;
}

// ── Main fetch logic ───────────────────────────────────

const MAX_PAGES = 10;

async function fetchArticle(p: VaultAdapter, articleId: string): Promise<void> {
  const basePath = p.isCurrentMode('SCRAP') ? '/u/scrap_list' : articleId;
  const isScrap = p.isCurrentMode('SCRAP');
  let nextUrl: string | null = buildPageUrl(p, articleId);

  for (let page = 0; page <= MAX_PAGES && nextUrl; page++) {
    const url = normalizeUrl(nextUrl);

    console.log(`Fetching article page: ${url}`);
    const { $html } = await fetchAndParse(url);

    const newLinks = filterLink(p, false, $html).filter(
      (link) => !p.articleList.includes(link),
    );

    if (newLinks.length > 0) {
      console.log(`Fetching Complete: ${url}`);
      p.articleList.push(...newLinks);

      // Non-scrap mode: stop after first successful fetch
      if (!isScrap) return;
    }

    nextUrl = extractNextPageUrl($html, basePath);

    if (!nextUrl) {
      console.log('NO ARTICLE PAGE LINK FOUND');
      return handleFetchComplete(p, isScrap);
    }

    console.log(`No articles found, trying next page: ${nextUrl}`);
  }

  handleFetchComplete(p, isScrap);
}

function handleFetchComplete(p: VaultAdapter, isScrap: boolean): void {
  if (!isScrap) {
    showToast('다음 게시글 탐색에 실패했습니다.');
    return;
  }

  if (p.isSeriesMode) {
    openScrapSeriesArticle(p);
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

export { fetchArticle, openScrapSeriesArticle };
