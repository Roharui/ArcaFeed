import { extractChannelId, normalizeArticlePath } from '@/utils/regex';
import type { VaultAdapter } from '@/vault';
import type { ArticleFilterImpl } from '@/types';

// ── Row extraction ─────────────────────────────────────

const ARTICLE_ROW =
  '#board_list .board_list_table tr.table_body:not(.notice):not(.other)';
const ARTICLE_ROW_SELECTOR = `${ARTICLE_ROW} a.subject_link, ${ARTICLE_ROW} a:has(span.subject_link)`;

function extractArticleRows(scope: ParentNode = document): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(ARTICLE_ROW_SELECTOR));
}

// ── Tab / Title filtering ──────────────────────────────

function buildFilterPredicate(
  filter: ArticleFilterImpl,
): (ele: HTMLElement) => boolean {
  const { title: titleFilter } = filter;

  const includeTitle = filter.includeTitle ?? [];
  const includes = filter.includeCaseSensitive
    ? includeTitle
    : includeTitle.map((word) => word.toLocaleLowerCase());

  if (titleFilter.length === 0 && includes.length === 0) return () => true;

  return (ele: HTMLElement) => {
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

    if (
      href &&
      (!p.href.channelId || extractChannelId(href) === p.href.channelId) &&
      !existingUrls.has(href)
    ) {
      existingUrls.add(href);
      result.push(href);
    }
  });

  return result;
}

export {
  buildFilterPredicate,
  extractArticleHref,
  extractArticleRows,
  filterLink,
};
