import $ from 'jquery';

import '@css/series.css';

import { eventBus } from '@/core/app-events';
import { parseSearchQuery } from './search';
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
    const url = withArticleKey(rawHref, articleKey);

    $a.attr('target', '');
    $a.attr('rel', '');
    $a.attr('href', url);

    return { url, element: el };
  });
}

/**
 * Find the index of the current page within the series list.
 */
function findCurrentIndex(entries: SeriesEntry[]): number {
  const currentPath = window.location.pathname;
  return entries.findIndex(({ url }) => url.includes(currentPath));
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

  // Clamp window: at most WINDOW_SIZE, don't exceed bounds
  const end = Math.min(total, currentIndex + 3);
  const start = Math.max(0, end - WINDOW_SIZE);

  return entries.slice(start, end);
}

// ── DOM Building ───────────────────────────────────────

function buildShortcutDiv(entries: SeriesEntry[]): JQuery<HTMLElement> {
  return $('<div>', { class: 'article-series' })
    .css('max-height', 'max-content')
    .css('margin-top', '1rem')
    .append(entries.map(({ element }) => $(element).clone()));
}

function buildEnableSeriesButton(): JQuery<HTMLElement> {
  return $('<button>', {
    type: 'button',
    title: '이 글의 시리즈를 새 탭에서 열기',
    class: 'series-control-btn enable-series',
  })
    .append(
      $('<span>', { class: 'bi-collection', 'aria-hidden': 'true' }),
      $('<span>', { text: '시리즈 모드 열기' }),
      $('<span>', { class: 'bi-box-arrow-up-right', 'aria-hidden': 'true' }),
    )
    .on('click', () => eventBus.emit('enableSeries'));
}

// ── Public API ─────────────────────────────────────────

function initSeriesContent(p: VaultAdapter): void {
  const $series = $('.article-series');
  if ($series.length === 0) return;

  // Keep only the first series element, remove duplicates
  $series.slice(1).remove();

  const $links = $series.first().find('.series-link');
  $links.css('display', 'block !important');

  // Collapsible toggle
  $('.series-collapsible').on('click', function () {
    $(this).parent().toggleClass('extend');
  });

  const entries = parseSeriesEntries($links, getCurrentArticleKey());
  const currentIndex = findCurrentIndex(entries);
  if (currentIndex === -1) return;

  const window_ = pickWindow(entries, currentIndex);

  $('.article-body')!.append(buildShortcutDiv(window_));

  // Scrap and subscription feeds also use the series flag.
  // Hide the button only when already browsing a post's own series.
  if (p.isSeriesMode && !p.isScrapMode && p.seriesChannels.length === 0) return;

  // Other feeds can open this post's series in a separate tab.
  const $btnWrapper = $('<div>', { class: 'series-control-btns' }).append(
    buildEnableSeriesButton(),
  );
  $('.article-body')!.after($btnWrapper);
}

function initSeriesBtnCss(_v: VaultAdapter): void {
  $('.series-control-btn.enable-series').css('opacity', '1');
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

export { initSeriesContent, initEnableSeries, initSeriesBtnCss };
