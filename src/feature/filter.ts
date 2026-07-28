import $ from 'jquery';

import { getArticleId } from '@/utils';
import {
  createArticleFilterRule,
  matchesArticleFilter,
  normalizeFilterTokens,
} from './filter-rules';

import type { VaultAdapter } from '@/vault';
import type { ArticleFilterImpl } from '@/types';

// ── Constants ──────────────────────────────────────────

const LEGACY_NO_TAB_CATEGORY = '노탭';
const NO_TAB_CATEGORY_WITHOUT_IMAGE = '노탭(짤X)';
const NO_TAB_CATEGORY_WITH_IMAGE = '노탭(짤O)';

const NO_TAB_CATEGORIES = [
  NO_TAB_CATEGORY_WITHOUT_IMAGE,
  NO_TAB_CATEGORY_WITH_IMAGE,
];

// ── Row extraction ─────────────────────────────────────

const ARTICLE_ROW_SELECTOR = [
  'div.article-list > div.list-table.table > a.vrow.column',
  'div.article-list > div.list-table.hybrid a.title.hybrid-title',
  'div.scrap-list > div.article-list.admin > div.list-table > a.vrow.column',
].join(', ');

function extractArticleRows($scope: JQuery<HTMLElement>): JQuery<HTMLElement> {
  return $scope.find(ARTICLE_ROW_SELECTOR).not('.notice');
}

// ── Article key injection ──────────────────────────────

function injectArticleKeys(
  $rows: JQuery<HTMLElement>,
  articleKey: string,
): void {
  if (!articleKey) return;

  $rows.each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href) return;

    try {
      const url = new URL(href, window.location.origin);
      if (url.searchParams.get('articleKey') === articleKey) return;

      url.searchParams.set('articleKey', articleKey);
      $el.attr('href', `${url.pathname}${url.search}`);
    } catch {
      // Ignore malformed links injected by the host or another extension.
    }
  });
}

// ── Tab / Title filtering ──────────────────────────────

function expandTabCategories(tabCategories: string[]): string[] {
  return [
    ...new Set(
      normalizeFilterTokens(tabCategories).flatMap((cat) =>
        cat === LEGACY_NO_TAB_CATEGORY ? NO_TAB_CATEGORIES : [cat],
      ),
    ),
  ];
}

function getTabTypeText($ele: JQuery<HTMLElement>): string {
  const badgeText = $ele.find('.text-bg-success').text().trim();
  if (badgeText.length > 0) return badgeText;

  return $ele.find('.media-icon.bi-images').length > 0
    ? NO_TAB_CATEGORY_WITH_IMAGE
    : NO_TAB_CATEGORY_WITHOUT_IMAGE;
}

function getArticleTitleText($ele: JQuery<HTMLElement>): string {
  return $ele.find('.title').addBack('.title').text().trim();
}

function buildFilterPredicate(
  filter: ArticleFilterImpl,
): (ele: HTMLElement) => boolean {
  const { tab: tabFilter, title: titleFilter } = filter;
  const rule = createArticleFilterRule(
    expandTabCategories(tabFilter),
    titleFilter,
  );

  return (ele: HTMLElement) => {
    const $ele = $(ele);
    return matchesArticleFilter(
      rule,
      getTabTypeText($ele),
      getArticleTitleText($ele),
    );
  };
}

// ── Href extraction ────────────────────────────────────

function extractArticleHref($ele: JQuery<HTMLElement>): string | null {
  const href = $ele.attr('href');
  if (!href) return null;

  try {
    const url = new URL(href, window.location.origin);
    const isArcaLive =
      url.hostname === 'arca.live' || url.hostname.endsWith('.arca.live');
    if (!isArcaLive) return null;

    const normalizedPath = url.pathname.replace(/\/+$/, '');
    return getArticleId(normalizedPath) ? normalizedPath : null;
  } catch {
    return null;
  }
}

// ── Public API ─────────────────────────────────────────

/**
 * Filter article rows, optionally apply CSS opacity, and return
 * deduplicated normalized hrefs.
 */
function filterLink(
  p: VaultAdapter,
  applyCss: boolean = false,
  $html?: JQuery<HTMLElement>,
): string[] {
  const $scope = $html ?? $('.root-container');
  const $rows = extractArticleRows($scope);

  injectArticleKeys($rows, p.href.articleKey);

  const filter = p.articleFilterConfig[p.href.channelId] || {
    tab: [],
    title: [],
    disableSwiper: false,
    onlyBest: false,
  };
  const predicate = buildFilterPredicate(filter);
  const seenUrls = new Set(p.articleList);

  const result: string[] = [];

  $rows.each((_, ele) => {
    const allowed = predicate(ele);
    const $ele = $(ele);

    if (applyCss) {
      $ele.css('opacity', allowed ? '1' : '0.5');
    }

    if (!allowed) return;

    const href = extractArticleHref($ele);
    if (href && !seenUrls.has(href)) {
      seenUrls.add(href);
      result.push(href);
    }
  });

  return result;
}

export {
  buildFilterPredicate,
  expandTabCategories,
  extractArticleHref,
  extractArticleRows,
  filterLink,
  getArticleTitleText,
  getTabTypeText,
  LEGACY_NO_TAB_CATEGORY,
  NO_TAB_CATEGORY_WITH_IMAGE,
  NO_TAB_CATEGORY_WITHOUT_IMAGE,
  NO_TAB_CATEGORIES,
};
