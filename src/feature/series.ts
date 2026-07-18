import $ from 'jquery';

import { parseSearchQuery } from '@/feature';
import {
  createArticleKey,
  getCurrentArticleKey,
  withArticleKey,
} from '@/utils/article-key';

import type { VaultAdapter } from '@/vault';

// ── Types ──────────────────────────────────────────────

interface SeriesEntry {
  url: string;
  element: HTMLElement;
}

// ── DOM Parsing ────────────────────────────────────────

/**
 * Extract series link entries from the page DOM.
 * Strips target="_blank" and injects articleKey into hrefs.
 */
function parseSeriesEntries(
  $links: JQuery<HTMLElement>,
  articleKey: string,
): SeriesEntry[] {
  return $links.toArray().map((el) => {
    const $a = $(el).find('a');
    const rawHref = $a.attr('href') || '';

    $a.attr('target', '');
    $a.attr('rel', '');
    $a.attr('href', withArticleKey(rawHref, articleKey));

    return { url: withArticleKey(rawHref, articleKey), element: el };
  });
}

// ── Public API ─────────────────────────────────────────

/**
 * Re-apply series button CSS when series mode state changes.
 * (UI elements are rendered by the series plugin.)
 */
function initSeriesBtnCss(_v: VaultAdapter): void {
  $('.series-control-btn.enable-series').css('opacity', '1');

  // Reactive: re-apply when series mode activates
  _v.subscribe((state) => {
    if (state.isSeriesMode) {
      $('.series-control-btn.enable-series').css('opacity', '1');
    }
  });
}

function initEnableSeries(p: VaultAdapter): void {
  const entries = parseSeriesEntries(
    $('.article-series').first().find('.series-link'),
    getCurrentArticleKey(),
  );

  parseSearchQuery(p);

  const currentIndex = Math.max(
    0,
    entries.findIndex(({ url }) => url.includes(p.href.articleId)),
  );

  const nextKey = createArticleKey();
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('articleKey', nextKey);

  p.copySeriesStorage(
    p.articleKey,
    nextKey,
    entries.map((e) => e.url),
    currentIndex,
    p.searchQuery,
  );

  window.open(nextUrl.toString(), '_blank', 'noopener');
}

export { initEnableSeries, initSeriesBtnCss };
