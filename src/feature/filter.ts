import { normalizeArticlePath } from '@/utils/regex';
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

const ARTICLE_ROW =
  '#board_list .board_list_table tr.table_body:not(.notice):not(.other)';
const ARTICLE_ROW_SELECTOR = `${ARTICLE_ROW} a.subject_link, ${ARTICLE_ROW} a:has(span.subject_link)`;

function extractArticleRows(scope: ParentNode = document): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(ARTICLE_ROW_SELECTOR));
}

// ── Article key injection ──────────────────────────────

function injectArticleKeys(rows: HTMLElement[], articleKey: string): void {
  if (!articleKey) return;
  const encodedKey = encodeURIComponent(articleKey);
  const keyParam = `articleKey=${encodedKey}`;

  rows.forEach((el) => {
    const href = el.getAttribute('href');
    if (!href) return;

    if (href.startsWith('/') && !href.includes('#')) {
      const queryIndex = href.indexOf('?');
      if (queryIndex === -1) {
        el.setAttribute('href', `${href}?${keyParam}`);
        return;
      }
      const query = href.slice(queryIndex + 1);
      if (!query.includes('articleKey=')) {
        el.setAttribute('href', `${href}&${keyParam}`);
        return;
      }
    }

    const url = new URL(href, window.location.origin);
    if (
      !normalizeArticlePath(url.href) ||
      url.searchParams.get('articleKey') === articleKey
    )
      return;

    url.searchParams.set('articleKey', articleKey);
    el.setAttribute('href', `${url.pathname}${url.search}`);
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

function buildFilterPredicate(
  filter: ArticleFilterImpl,
): (ele: HTMLElement) => boolean {
  const { tab: tabFilter, title: titleFilter } = filter;

  const includeTitle = filter.includeTitle ?? [];
  const includes = filter.includeCaseSensitive
    ? includeTitle
    : includeTitle.map((word) => word.toLocaleLowerCase());

  // No active filters → allow all
  if (
    tabFilter.length === 0 &&
    titleFilter.length === 0 &&
    includes.length === 0
  ) {
    return () => true;
  }

  const allowedTabs = new Set(expandTabCategories(tabFilter));

  return (ele: HTMLElement) => {
    if (allowedTabs.size > 0) {
      const badgeText = ele
        .closest('tr')
        ?.querySelector('.divsn, .cate_label')
        ?.textContent?.trim()
        .replace(/^\[|\]$/g, '');
      const tab =
        badgeText ||
        (ele.closest('tr')?.querySelector('.icon-picture')
          ? NO_TAB_CATEGORY_WITH_IMAGE
          : NO_TAB_CATEGORY_WITHOUT_IMAGE);
      if (!allowedTabs.has(tab)) return false;
    }
    if (titleFilter.length === 0 && includes.length === 0) return true;
    const title = ele.textContent?.trim() ?? '';
    if (titleFilter.some((keyword) => title.includes(keyword))) return false;
    if (!includes.length) return true;
    const content = filter.includeCaseSensitive
      ? title
      : title.toLocaleLowerCase();
    return filter.includeMode === 'all'
      ? includes.every((word) => content.includes(word))
      : includes.some((word) => content.includes(word));
  };
}

// ── Href extraction ────────────────────────────────────

function extractArticleHref(element: HTMLElement): string | null {
  const href = element.getAttribute('href');
  if (!href) return null;

  return normalizeArticlePath(href);
}

// ── Public API ─────────────────────────────────────────

/**
 * Filter article rows, optionally apply CSS opacity, and return
 * deduplicated normalized hrefs.
 */
function filterLink(
  p: VaultAdapter,
  applyCss: boolean = false,
  scope?: ParentNode,
): string[] {
  const rows = extractArticleRows(scope);

  if (applyCss) injectArticleKeys(rows, p.href.articleKey);

  const filter = p.articleFilterConfig[p.href.channelId] || {
    tab: [],
    title: [],
    disableSwiper: false,
    onlyBest: false,
    channelName: '',
  };
  const predicate = buildFilterPredicate(filter);
  const existingUrls = new Set(p.articleList);
  // Best status comes from the site's best-only listing, not vote thresholds.
  const bestListing =
    new URLSearchParams(p.href.search).get('view_best') === '1';

  const result: string[] = [];

  rows.forEach((ele) => {
    const allowed = predicate(ele);
    const href = extractArticleHref(ele);

    if (applyCss) {
      const matchesBest =
        !filter.onlyBest ||
        bestListing ||
        (href !== null && existingUrls.has(href));
      ele.style.opacity = allowed && matchesBest ? '1' : '0.5';
    }

    if (!allowed) return;

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
  LEGACY_NO_TAB_CATEGORY,
  NO_TAB_CATEGORY_WITH_IMAGE,
  NO_TAB_CATEGORY_WITHOUT_IMAGE,
  NO_TAB_CATEGORIES,
};
