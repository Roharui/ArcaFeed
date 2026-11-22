import { mergeState } from '@/vault/lazy-state';
import { createElement } from '@/utils/dom';

import { extractChannelId } from '@/utils';

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

  const contentWrapper = document.querySelector<HTMLElement>(
    '.body .content-wrapper',
  );
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
      .querySelector(`.arca-resize-handle-${dragging}`)
      ?.classList.remove('dragging');
    dragging = null;

    p.uiSettings = mergeState(p.uiSettings, { contentWidth: currentWidth });
    p.flushSave();
  });

  // Create both handles
  for (const side of ['left', 'right'] as const) {
    const handle = createElement('div', {
      class: `arcafeed-resize-handle arca-resize-handle-${side} swiper-no-swiping`,
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

  // CSS class-based toggles (sync with arcalive.css rules)
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
    document
      .querySelectorAll<HTMLElement>('.body .content-wrapper')
      .forEach((wrapper) => {
        wrapper.style.setProperty(
          '--content-max-width',
          `${settings.contentWidth}px`,
        );
      });
}

// ── Mode-specific UI initializers ──────────────────────

function initArticleModeUI(p: VaultAdapter): void {
  document.body.append(
    ...Array.from(document.querySelectorAll('.nav-control')),
  );

  // Open cross-channel article links in a new tab
  // to avoid disrupting the current slide session.
  document
    .querySelectorAll<HTMLAnchorElement>('.included-article-list a[href]')
    .forEach((el) => {
      const href = el.getAttribute('href');
      if (!href) return;
      const targetChannelId = extractChannelId(href);
      if (targetChannelId && targetChannelId !== p.href.channelId) {
        el.target = '_blank';
        el.rel = 'noopener';
      }
    });
}

const MODE_UI_INIT: Record<string, (p: VaultAdapter) => void> = {
  ARTICLE: initArticleModeUI,
};

const initializedVaults = new WeakSet<VaultAdapter>();

// ── Init ────────────────────────────────────────────────

function initUi(p: VaultAdapter): void {
  if (initializedVaults.has(p)) return;
  initializedVaults.add(p);
  document.body.classList.add('arcafeed');

  // Wrap navbar for styling (stays in .root-container outside the swiper)
  const navbar = document.querySelector('nav.navbar');
  if (navbar && !navbar.parentElement?.classList.contains('navbar-wrapper')) {
    const wrapper = createElement('div', {
      class: 'navbar-wrapper swiper-no-swiping',
    });
    navbar.before(wrapper);
    wrapper.append(navbar);
  }

  const ads = Array.from(document.querySelectorAll('.ad.small-ad'));
  const stickyContainers = document.querySelectorAll('.sticky-container');
  stickyContainers.forEach((container, index) => {
    container.prepend(
      ...(index === stickyContainers.length - 1
        ? ads
        : ads.map((ad) => ad.cloneNode(true))),
    );
  });

  document
    .querySelectorAll('.board-category.hide-scrollbar')
    .forEach((category) => category.classList.add('swiper-no-swiping'));

  // Apply current UI settings
  applyUISettings(p.uiSettings);

  // In series mode, automatically hide the included article list and btns-board
  document.body.classList.toggle('hide-included-article-list', p.isSeriesMode);
  document.body.classList.toggle('hide-btns-board', p.isSeriesMode);

  // Install resize handle (PC only, once)
  installResizeHandle(p);

  MODE_UI_INIT[p.href.mode]?.(p);

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
