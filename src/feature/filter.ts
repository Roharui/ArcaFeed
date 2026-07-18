import $ from 'jquery';

import { getArticleId } from '@/utils';

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
  const badgeText = $ele.find('.badge-success').text().trim();
  if (badgeText.length > 0) return badgeText;

  return $ele.find('.media-icon.ion-ios-photos-outline').length > 0
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
    const $ele = $(ele);
    const tabOk = allowedTabs.has(getTabTypeText($ele));
    const titleOk = titleFilter.every(
      (keyword) => !$ele.find('.title').text().trim().includes(keyword),
    );
    return tabOk && titleOk;
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
  console.log('Filtering links based on article list and filter config...');

  const $scope = $html ?? $('.root-container');
  const $rows = extractArticleRows($scope);

  injectArticleKeys($rows, p.href.articleKey);

  const filter = p.articleFilterConfig[p.href.channelId] || {
    tab: [],
    title: [],
    disableSwiper: false,
  };
  const predicate = buildFilterPredicate(filter);
  // 기존 articleList에 있는 articleId와 현재 페이지 내 중복을 모두 제외
  const seenIds = new Set(p.articleList.map((link) => getArticleId(link)));

  const result: string[] = [];

  $rows.each((_, ele) => {
    const allowed = predicate(ele);
    const $ele = $(ele);

    if (applyCss) {
      $ele.css('opacity', allowed ? '1' : '0.5');
    }

    if (!allowed) return;

    const href = extractArticleHref($ele);
    if (!href) return;

    const articleId = getArticleId(href);
    if (!seenIds.has(articleId)) {
      seenIds.add(articleId);
      result.push(href);
    }
  });

  return result;
}

export {
  expandTabCategories,
  filterLink,
  getTabTypeText,
  LEGACY_NO_TAB_CATEGORY,
  NO_TAB_CATEGORY_WITH_IMAGE,
  NO_TAB_CATEGORY_WITHOUT_IMAGE,
  NO_TAB_CATEGORIES,
};
