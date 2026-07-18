/**
 * ArcaFeed Series Plugin — Core Logic
 *
 * Provides series shortcut UI and "Enable Series" button on article pages.
 * Uses jQuery ($) which is provided by the page (externals).
 * Exported for use in both standalone and bundled builds.
 */

import $ from 'jquery';

// ── CSS ─────────────────────────────────────────────────

const SERIES_CSS = `
.series-control-btns {
  display: flex;
  justify-content: space-around;
}

.series-control-btn {
  cursor: pointer;
  border-radius: 5px;
  padding: 5px;
}

.series-control-btn.enable-series {
  background-color: var(--color-primary-theme);
}

.series-control-btn.disable-series {
  background-color: var(--color-link-broken);
}
`;

function injectCSS(): void {
  $('<style>').text(SERIES_CSS).appendTo('head');
}

// ── Types ──────────────────────────────────────────────

interface SeriesEntry {
  url: string;
  element: HTMLElement;
}

// ── Helpers ────────────────────────────────────────────

function getArticleKeyFromUrl(): string {
  return new URLSearchParams(window.location.search).get('articleKey') || '';
}

function withArticleKey(href: string, articleKey: string): string {
  if (!articleKey) return href;
  const url = new URL(href, window.location.origin);
  url.searchParams.set('articleKey', articleKey);
  return url.toString();
}

function isPluginEnabled(): boolean {
  try {
    const raw = localStorage.getItem('arcaFeed:pluginSettings');
    if (!raw) return true;
    const settings = JSON.parse(raw);
    return settings.series !== false;
  } catch {
    return true;
  }
}

function register(): void {
  const bridge = (window as any).__arcaFeed;
  if (!bridge) return;
  if (!bridge.plugins) bridge.plugins = [];
  bridge.plugins.push({
    id: 'series',
    name: '시리즈 바로가기',
    description: '게시글 하단에 시리즈 바로가기 UI와 시리즈 모드 활성화 버튼을 제공합니다.',
  });
}

// ── DOM Parsing ────────────────────────────────────────

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

function findCurrentIndex(entries: SeriesEntry[]): number {
  const currentPath = window.location.pathname;
  return entries.findIndex(({ url }) => url.includes(currentPath));
}

const WINDOW_SIZE = 5;

function pickWindow(
  entries: SeriesEntry[],
  currentIndex: number,
): SeriesEntry[] {
  const total = entries.length;
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
  }).on('click', () => {
    const bus = (window as any).__arcaFeed?.eventBus;
    if (bus) bus.emit('enableSeries');
  });
}

// ── Main Logic ─────────────────────────────────────────

function initSeriesContent(p?: { isSeriesMode?: boolean }): void {
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

  const entries = parseSeriesEntries($links, getArticleKeyFromUrl());
  const currentIndex = findCurrentIndex(entries);
  if (currentIndex === -1) return;

  // In series mode, don't show the bottom post list or enable button
  if (p?.isSeriesMode) return;

  const windowEntries = pickWindow(entries, currentIndex);

  const $articleBody = $('.article-body');
  if (!$articleBody.length) return;

  $articleBody.append(buildShortcutDiv(windowEntries));

  // Show "Enable Series" button when not in series mode
  const $btnWrapper = $('<div>', { class: 'series-control-btns' }).append(
    buildEnableSeriesButton(),
  );
  $articleBody.after($btnWrapper);
}

// ── Page Mode Detection ────────────────────────────────

export { initSeriesContent };

export function isArticlePage(): boolean {
  return /\/b\/[A-Za-z0-9]+\/[0-9]+/.test(window.location.pathname);
}

// ── Plugin Init ────────────────────────────────────────

export function initSeriesPlugin(): void {
  register();

  if (!isPluginEnabled()) {
    console.log('[Series Plugin] Disabled, skipping.');
    return;
  }

  if (!isArticlePage()) {
    console.log('[Series Plugin] Not an article page, skipping.');
    return;
  }

  injectCSS();
  console.log('[Series Plugin] Loaded!');

  // Register step function on the global pluginSteps array.
  // The core will execute these steps in its init pipeline.
  const bridge = (window as any).__arcaFeed;
  if (bridge) {
    bridge.pluginStepsAfter = bridge.pluginStepsAfter || [];
    bridge.pluginStepsAfter.push((p: any) => {
      console.log('[Series Plugin] Rendering series content.');
      initSeriesContent(p);
    });
  } else {
    console.warn('[Series Plugin] ArcaFeed bridge not available.');
  }
}
