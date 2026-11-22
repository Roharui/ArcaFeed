import { mergeState } from '@/vault/lazy-state';
import { createElement } from '@/utils/dom';

import type { VaultAdapter } from '@/vault';
import type { UISettings } from '@/types';

// ── Resize handle (PC only) ────────────────────────────

const MIN_CONTENT_WIDTH = 700;
const MAX_CONTENT_WIDTH = 1400;

let resizeHandleInstalled = false;

function installResizeHandle(p: VaultAdapter): void {
  const shouldInstall =
    !resizeHandleInstalled &&
    window.matchMedia('(min-width: 1024px)').matches &&
    !window.matchMedia('(pointer: coarse)').matches &&
    p.isCurrentMode('CHANNEL', 'ARTICLE');
  if (!shouldInstall) return;

  const contentWrapper = document.querySelector<HTMLElement>('#board');
  if (!contentWrapper) return;
  const wrapper = contentWrapper;
  wrapper.style.position = 'relative';

  // Shared drag state
  let dragging: 'left' | 'right' | null = null;
  let currentWidth = 0;
  let pointerX = 0;
  let resizeFrame: number | null = null;

  function applyResize(): void {
    resizeFrame = null;
    if (!dragging) return;
    const rect = wrapper.getBoundingClientRect();
    const newWidth =
      dragging === 'right' ? pointerX - rect.left : rect.right - pointerX;
    const width = Math.min(
      MAX_CONTENT_WIDTH,
      Math.max(MIN_CONTENT_WIDTH, Math.round(newWidth)),
    );
    if (width === currentWidth) return;
    currentWidth = width;
    wrapper.style.setProperty('--content-max-width', `${currentWidth}px`);
  }

  function onMouseDown(side: 'left' | 'right') {
    return (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      dragging = side;
      currentWidth = p.uiSettings.contentWidth;
      pointerX = e.clientX;
      (e.currentTarget as HTMLElement).classList.add('dragging');
    };
  }

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;

    pointerX = e.clientX;
    if (resizeFrame === null) resizeFrame = requestAnimationFrame(applyResize);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
      applyResize();
    }

    wrapper
      .querySelector(`.rulifeed-resize-handle-${dragging}`)
      ?.classList.remove('dragging');
    dragging = null;

    p.uiSettings = mergeState(p.uiSettings, { contentWidth: currentWidth });
    p.flushSave();
  });

  // Create both handles
  for (const side of ['left', 'right'] as const) {
    const handle = createElement('div', {
      class: `rulifeed-resize-handle rulifeed-resize-handle-${side} swiper-no-swiping`,
    });
    handle.addEventListener('mousedown', onMouseDown(side));
    wrapper.append(handle);
  }

  resizeHandleInstalled = true;
}

// ── UI Settings ─────────────────────────────────────────

function applyUISettings(settings: UISettings, previous?: UISettings): void {
  const bodyClasses = {
    hideBlur: 'hide-blur',
    hideNavControl: 'hide-nav-control',
    hideArticleTitle: 'hide-article-title',
    hideArticleAuthor: 'hide-article-author',
    hideArticleTime: 'hide-article-time',
    hideArticleView: 'hide-article-view',
  } as const;
  if (
    previous &&
    previous.hideScrollbar === settings.hideScrollbar &&
    previous.contentWidth === settings.contentWidth &&
    (Object.keys(bodyClasses) as (keyof typeof bodyClasses)[]).every(
      (key) => previous[key] === settings[key],
    )
  )
    return;

  // CSS class-based toggles (sync with ruliweb.css rules)
  if (!previous || previous.hideScrollbar !== settings.hideScrollbar)
    document.documentElement.classList.toggle(
      'hide-scrollbar',
      settings.hideScrollbar,
    );
  for (const key of Object.keys(bodyClasses) as (keyof typeof bodyClasses)[]) {
    if (!previous || previous[key] !== settings[key])
      document.body.classList.toggle(bodyClasses[key], settings[key]);
  }

  // Content width (CSS variable on content-wrapper)
  if (!previous || previous.contentWidth !== settings.contentWidth)
    document.querySelectorAll<HTMLElement>('#board').forEach((wrapper) => {
      wrapper.style.setProperty(
        '--content-max-width',
        `${settings.contentWidth}px`,
      );
    });
}

const initializedVaults = new WeakSet<VaultAdapter>();

// ── Init ────────────────────────────────────────────────

function initUi(p: VaultAdapter): void {
  if (initializedVaults.has(p)) return;
  initializedVaults.add(p);
  document.body.classList.add('rulifeed');

  document
    .querySelectorAll(
      '.category_list, .category_menu, #board_top, [contenteditable]',
    )
    .forEach((element) => {
      element.classList.add('swiper-no-swiping');
    });

  // Apply current UI settings
  applyUISettings(p.uiSettings);

  // In series mode, automatically hide the included article list and btns-board
  document.body.classList.toggle('hide-included-article-list', p.isSeriesMode);
  document.body.classList.toggle('hide-btns-board', p.isSeriesMode);
  document.body.classList.toggle(
    'rulifeed-article-page',
    p.href.mode === 'ARTICLE',
  );

  // Install resize handle (PC only, once)
  installResizeHandle(p);

  // Reactive: subscribe to state changes to re-apply UI settings
  let lastSettings = p.uiSettings;
  let lastSeriesMode = p.isSeriesMode;
  p.subscribe((state) => {
    if (state.uiSettings !== lastSettings) {
      applyUISettings(state.uiSettings, lastSettings);
      lastSettings = state.uiSettings;
    }
    if (state.isSeriesMode !== lastSeriesMode) {
      lastSeriesMode = state.isSeriesMode;
      document.body.classList.toggle(
        'hide-included-article-list',
        lastSeriesMode,
      );
      document.body.classList.toggle('hide-btns-board', lastSeriesMode);
    }
  });
}

export { initUi };
