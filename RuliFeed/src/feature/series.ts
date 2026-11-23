import { createElement, setAttributes } from '@feed/core/utils/dom';

import '@css/series.css';

import { eventBus } from '@/core/app-events';
import { navigate, isNavigating } from '@/feature/navigation';
import { OperationError } from '@/utils/operation-error';
import { normalizedSearchQuery } from './search';
import { createArticleKey } from '@/utils/article-key';

import { navigationMode } from '@/vault/navigation-context';
import type { VaultAdapter } from '@/vault';

const openedSeriesTabs = new WeakMap<VaultAdapter, Window>();

// ── Types ──────────────────────────────────────────────

interface SeriesEntry {
  url: string;
  element: HTMLElement;
}

// ── DOM Parsing ────────────────────────────────────────

/**
 * Extract series link entries from the page DOM.
 * Strips target="_blank" so series articles open in the current tab.
 */
function parseSeriesEntries(links: Iterable<HTMLElement>): SeriesEntry[] {
  return Array.from(links, (element) => {
    const anchors = element.querySelectorAll('a');
    const url = anchors[0]?.getAttribute('href') || '';
    anchors.forEach((anchor) =>
      setAttributes(anchor, { target: '', rel: '', href: url }),
    );
    return { url, element };
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

function buildShortcutDiv(entries: SeriesEntry[]): HTMLDivElement {
  return createElement(
    'div',
    {
      class: 'article-series',
      style: 'max-height: max-content; margin-top: 1rem',
    },
    ...entries.map(({ element }) => element.cloneNode(true)),
  );
}

function buildEnableSeriesButton(): HTMLButtonElement {
  const button = createElement(
    'button',
    {
      type: 'button',
      title: '이 글의 시리즈를 새 탭에서 열기',
      class: 'series-control-btn enable-series',
    },
    createElement('span', { class: 'bi-collection', 'aria-hidden': 'true' }),
    createElement('span', { text: '시리즈 모드 열기' }),
    createElement('span', {
      class: 'bi-box-arrow-up-right',
      'aria-hidden': 'true',
    }),
  );
  button.addEventListener('click', () => void eventBus.emit('enableSeries'));
  return button;
}

// ── Public API ─────────────────────────────────────────

function initSeriesContent(p: VaultAdapter): void {
  const [series, ...duplicates] = Array.from(
    document.querySelectorAll('.article-series'),
  );
  if (!series) return;
  duplicates.forEach((element) => element.remove());

  const links = series.querySelectorAll<HTMLElement>('.series-link');
  links.forEach((link) =>
    link.style.setProperty('display', 'block', 'important'),
  );
  document.querySelectorAll('.series-collapsible').forEach((element) => {
    element.addEventListener('click', () =>
      element.parentElement?.classList.toggle('extend'),
    );
  });

  const entries = parseSeriesEntries(Array.from(links));
  const currentIndex = findCurrentIndex(entries);
  if (currentIndex === -1) return;

  const window_ = pickWindow(entries, currentIndex);

  const bodies = document.querySelectorAll('.view_content');
  bodies.forEach((body) => body.append(buildShortcutDiv(window_)));

  if (navigationMode(p) === 'series') return;
  bodies.forEach((body) =>
    body.after(
      createElement(
        'div',
        { class: 'series-control-btns' },
        buildEnableSeriesButton(),
      ),
    ),
  );
}

function initSeriesBtnCss(_v: VaultAdapter): void {
  document
    .querySelectorAll<HTMLElement>('.series-control-btn.enable-series')
    .forEach((button) => {
      button.style.opacity = '1';
    });
}

async function initEnableSeries(p: VaultAdapter): Promise<void> {
  if (isNavigating(p)) return;
  const previousTab = openedSeriesTabs.get(p);
  if (previousTab && !previousTab.closed) {
    previousTab.focus();
    return;
  }
  const entries = parseSeriesEntries(
    Array.from(
      document
        .querySelector('.article-series')
        ?.querySelectorAll<HTMLElement>('.series-link') ?? [],
    ),
  );

  if (!entries.length)
    throw new OperationError('command', '시리즈 글을 찾지 못했습니다.');
  const query = normalizedSearchQuery(p.href.search);

  const currentIndex = Math.max(
    0,
    entries.findIndex(({ url }) => url.includes(p.href.articleId)),
  );

  const nextKey = createArticleKey();
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('articleKey', nextKey);

  let tab: Window | null = null;
  await navigate(
    p,
    () => {
      tab!.location.replace(nextUrl.toString());
      openedSeriesTabs.set(p, tab!);
    },
    {
      stayOnPage: true,
      prepare: () => {
        try {
          tab = window.open('about:blank', '_blank');
        } catch (error) {
          throw new OperationError(
            'navigation',
            '새 탭을 열지 못했습니다. 다시 시도해주세요.',
            error,
          );
        }
        if (!tab)
          throw new OperationError(
            'navigation',
            '새 탭을 열지 못했습니다. 팝업 허용 설정을 확인하고 다시 시도해주세요.',
          );
        tab.opener = null;
        p.copySeriesStorage(
          p.articleKey,
          nextKey,
          entries.map((entry) => entry.url),
          currentIndex,
          query,
        );
      },
      rollback: () => {
        tab?.close();
        openedSeriesTabs.delete(p);
      },
    },
  );
}

export { initSeriesContent, initEnableSeries, initSeriesBtnCss };
