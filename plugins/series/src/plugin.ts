/**
 * ArcaFeed Series Plugin — Core Logic
 *
 * Provides series shortcut UI and "Enable Series" button on article pages.
 * Exported for use in both standalone and bundled builds.
 */

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
  const style = document.createElement('style');
  style.textContent = SERIES_CSS;
  document.head.appendChild(style);
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
  links: HTMLElement[],
  articleKey: string,
): SeriesEntry[] {
  return links.map((el) => {
    const a = el.querySelector('a');
    const rawHref = a?.getAttribute('href') || '';

    if (a) {
      a.setAttribute('target', '');
      a.setAttribute('rel', '');
      a.setAttribute('href', withArticleKey(rawHref, articleKey));
    }

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

function buildShortcutDiv(entries: SeriesEntry[]): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'article-series';
  div.style.maxHeight = 'max-content';
  div.style.marginTop = '1rem';
  entries.forEach(({ element }) => div.appendChild(element.cloneNode(true)));
  return div;
}

function buildEnableSeriesButton(): HTMLElement {
  const div = document.createElement('div');
  div.textContent = '시리즈 바로가기 활성화';
  div.className = 'series-control-btn enable-series';
  div.style.opacity = '1';
  div.addEventListener('click', () => {
    const bus = (window as any).__arcaFeed?.eventBus;
    if (bus) bus.emit('enableSeries');
  });
  return div;
}

// ── Main Logic ─────────────────────────────────────────

function initSeriesContent(): void {
  const $series = document.querySelectorAll('.article-series');
  if ($series.length === 0) return;

  if ($series.length > 1) $series[$series.length - 1].remove();

  const firstSeries = $series[0];
  const $links = firstSeries.querySelectorAll('.series-link');

  $links.forEach((link) => {
    (link as HTMLElement).style.display = 'block';
  });

  firstSeries.querySelectorAll('.series-collapsible').forEach((el) => {
    el.addEventListener('click', function (this: HTMLElement) {
      this.parentElement?.classList.toggle('extend');
    });
  });

  const articleKey = getArticleKeyFromUrl();
  const entries = parseSeriesEntries(Array.from($links) as HTMLElement[], articleKey);
  const currentIndex = findCurrentIndex(entries);
  if (currentIndex === -1) return;

  if (isSeriesModeActive()) return;

  const window_ = pickWindow(entries, currentIndex);
  const $articleBody = document.querySelector('.article-body');
  if (!$articleBody) return;

  $articleBody.appendChild(buildShortcutDiv(window_));

  const btnWrapper = document.createElement('div');
  btnWrapper.className = 'series-control-btns';
  btnWrapper.appendChild(buildEnableSeriesButton());
  $articleBody.after(btnWrapper);
}

function isSeriesModeActive(): boolean {
  return new URLSearchParams(window.location.search).has('articleKey');
}

// ── Page Mode Detection ────────────────────────────────

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

  const bus = (window as any).__arcaFeed?.eventBus;
  if (!bus) {
    console.warn('[Series Plugin] ArcaFeed eventBus not available.');
    return;
  }

  bus.on('init', () => {
    console.log('[Series Plugin] Rendering series content.');
    initSeriesContent();
  });
}
