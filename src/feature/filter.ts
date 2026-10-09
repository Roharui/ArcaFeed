import $ from 'jquery';

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

    const url = new URL(href, window.location.origin);
    if (url.searchParams.get('articleKey') === articleKey) return;

    url.searchParams.set('articleKey', articleKey);
    $el.attr('href', `${url.pathname}${url.search}`);
  });
}

// ── Tab / Title filtering ──────────────────────────────

function expandTabCategories(tabCategories: string[]): string[] {
  return [
    ...new Set(
      tabCategories.flatMap((cat) =>
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

function buildFilterPredicate(
  filter: ArticleFilterImpl,
): (ele: HTMLElement) => boolean {
  const { tab: tabFilter, title: titleFilter } = filter;

  // No active filters → allow all
  if (tabFilter.length === 0 && titleFilter.length === 0) {
    return () => true;
  }

  const allowedTabs = new Set(expandTabCategories(tabFilter));

  return (ele: HTMLElement) => {
    if (allowedTabs.size > 0) {
      const badgeText = ele
        .querySelector('.text-bg-success')
        ?.textContent?.trim();
      const tab =
        badgeText ||
        (ele.querySelector('.media-icon.bi-images')
          ? NO_TAB_CATEGORY_WITH_IMAGE
          : NO_TAB_CATEGORY_WITHOUT_IMAGE);
      if (!allowedTabs.has(tab)) return false;
    }
    if (titleFilter.length === 0) return true;
    const title =
      (ele.matches('.title')
        ? ele
        : ele.querySelector('.title')
      )?.textContent?.trim() ?? '';
    return !titleFilter.some((keyword) => title.includes(keyword));
  };
}

// ── Href extraction ────────────────────────────────────

function extractArticleHref($ele: JQuery<HTMLElement>): string | null {
  const href = $ele.attr('href');
  if (!href) return null;

  // Normalize: strip origin and query string → "/b/channel/12345"
  return href.replace('https://arca.live', '').replace(/\?.+$/, '');
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

  if (applyCss) injectArticleKeys($rows, p.href.articleKey);

  const filter = p.articleFilterConfig[p.href.channelId] || {
    tab: [],
    title: [],
    disableSwiper: false,
    onlyBest: false,
    channelName: '',
  };
  const predicate = buildFilterPredicate(filter);
  const existingUrls = new Set(p.articleList);

  const result: string[] = [];

  $rows.each((_, ele) => {
    const allowed = predicate(ele);
    const $ele = $(ele);

    if (applyCss) {
      $ele.css('opacity', allowed ? '1' : '0.5');
    }

    if (!allowed) return;

    const href = extractArticleHref($ele);
    if (href && !existingUrls.has(href)) {
      existingUrls.add(href);
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
  getTabTypeText,
  LEGACY_NO_TAB_CATEGORY,
  NO_TAB_CATEGORY_WITH_IMAGE,
  NO_TAB_CATEGORY_WITHOUT_IMAGE,
  NO_TAB_CATEGORIES,
};
