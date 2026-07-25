import $ from 'jquery';

import '@css/series.css';

import { eventBus } from '@/core';
import { parseSearchQuery } from '@/feature';
import {
  createArticleKey,
  getCurrentArticleKey,
  withArticleKey,
} from '@/utils/article-key';
import { getArticleId } from '@/utils/regex';

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
  return $links.toArray().flatMap((el) => {
    const $a = $(el).find('a').addBack('a').first();
    const rawHref = $a.attr('href') || '';
    if (!rawHref) return [];

    let url: string;
    try {
      url = withArticleKey(rawHref, articleKey);
      if (!getArticleId(url)) return [];
    } catch {
      return [];
    }
    $a.removeAttr('target');
    $a.removeAttr('rel');
    $a.attr('href', url);

    return [{ url, element: el }];
  });
}

/**
 * Find the index of the current page within the series list.
 */
function findCurrentIndex(entries: SeriesEntry[]): number {
  const normalizePath = (path: string) => path.replace(/\/+$/, '');
  const currentPath = normalizePath(window.location.pathname);

  return entries.findIndex(({ url }) => {
    try {
      return (
        normalizePath(new URL(url, window.location.origin).pathname) ===
        currentPath
      );
    } catch {
      return false;
    }
  });
}

// ── Sliding Window ─────────────────────────────────────

const WINDOW_SIZE = 5; // How many series entries to show at once

/**
 * Pick a sliding window of entries centered around currentIndex.
 */
function pickWindow(
  entries: SeriesEntry[],
  currentIndex: number,
): SeriesEntry[] {
  const total = entries.length;
  if (total <= WINDOW_SIZE) return entries.slice();

  const preferredStart = currentIndex - Math.floor(WINDOW_SIZE / 2);
  const start = Math.max(0, Math.min(preferredStart, total - WINDOW_SIZE));

  return entries.slice(start, start + WINDOW_SIZE);
}

// ── DOM Building ───────────────────────────────────────

function buildShortcutDiv(entries: SeriesEntry[]): JQuery<HTMLElement> {
  return $('<div>', {
    class: 'article-series arcafeed-series-shortcut',
    'aria-label': '현재 글 주변 시리즈 바로가기',
  })
    .css('max-height', 'max-content')
    .css('margin-top', '1rem')
    .append(entries.map(({ element }) => $(element).clone()));
}

function buildEnableSeriesButton(): JQuery<HTMLElement> {
  return $('<button>', {
    type: 'button',
    text: '시리즈 바로가기 활성화',
    class: 'series-control-btn enable-series',
    'aria-label': '시리즈 연속 탐색 활성화',
    css: { opacity: '1' },
  }).on('click.arcafeed-series', () => void eventBus.emit('enableSeries'));
}

// ── Public API ─────────────────────────────────────────

function initSeriesContent(p: VaultAdapter): void {
  $('.article-series.arcafeed-series-shortcut').remove();
  $('.series-control-btns.arcafeed-series-controls').remove();

  const $series = $('.article-series').not('.arcafeed-series-shortcut');
  if ($series.length === 0) return;

  // Keep the first source list. Removing `.last()` unconditionally also
  // removed the only list on pages where ArcaLive rendered a single copy.
  $series.slice(1).remove();

  const $links = $series.first().find('.series-link');
  $links.each((_, element) => {
    element.style.setProperty('display', 'block', 'important');
  });

  // Collapsible toggle
  $series
    .first()
    .find('.series-collapsible')
    .off('click.arcafeed-series')
    .on('click.arcafeed-series', function () {
      $(this).parent().toggleClass('extend');
    });

  const entries = parseSeriesEntries($links, getCurrentArticleKey());
  const currentIndex = findCurrentIndex(entries);
  if (currentIndex === -1) return;

  const window_ = pickWindow(entries, currentIndex);

  // In series mode, don't show the bottom post list or enable button
  if (p.isSeriesMode) return;

  const $articleBody = $('.article-body');
  if (!$articleBody.length) return;

  $articleBody.append(buildShortcutDiv(window_));

  // Show "Enable Series" button when not in series mode
  const $btnWrapper = $('<div>', {
    class: 'series-control-btns arcafeed-series-controls',
  }).append(buildEnableSeriesButton());
  $articleBody.after($btnWrapper);
}

function initSeriesBtnCss(_p: VaultAdapter): void {
  $('.series-control-btn.enable-series').css('opacity', '1');
}

function initEnableSeries(p: VaultAdapter): void {
  const $sourceSeries = $('.article-series')
    .not('.arcafeed-series-shortcut')
    .first();
  const $series = $sourceSeries.length
    ? $sourceSeries
    : $('.article-series.arcafeed-series-shortcut').first();
  const entries = parseSeriesEntries(
    $series.find('.series-link'),
    getCurrentArticleKey(),
  );

  parseSearchQuery(p);

  const currentIndex = findCurrentIndex(entries);
  if (currentIndex === -1) return;

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

export { initSeriesContent, initEnableSeries, initSeriesBtnCss };
