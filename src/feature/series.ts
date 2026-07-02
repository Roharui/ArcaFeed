import $ from 'jquery';

import '@css/series.css';

import { eventBus } from '@/core';
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
  return $('<div>', {
    text: '시리즈 바로가기 활성화',
    class: 'series-control-btn enable-series',
    css: { opacity: '1' },
  }).on('click', () => eventBus.emit('enableSeries'));
}

// ── Public API ─────────────────────────────────────────

function initSeriesContent(p: VaultAdapter): void {
  const $series = $('.article-series');
  if ($series.length === 0) return;

  // Keep only the first series element, remove duplicates
  $series.last().remove();

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

  // In series mode, don't show the bottom post list or enable button
  if (p.isSeriesMode) return;

  const $articleBody = $('.article-body');
  if (!$articleBody.length) return;

  $articleBody.append(buildShortcutDiv(window_));

  // Show "Enable Series" button when not in series mode
  const $btnWrapper = $('<div>', { class: 'series-control-btns' }).append(
    buildEnableSeriesButton(),
  );
  $articleBody.after($btnWrapper);
}

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

export { initSeriesContent, initEnableSeries, initSeriesBtnCss };
