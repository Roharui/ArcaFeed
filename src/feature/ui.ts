import $ from 'jquery';

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

  const $wrapper = $('.body .content-wrapper');
  if (!$wrapper.length) return;

  $wrapper.css('position', 'relative');

  // Shared drag state
  let dragging: 'left' | 'right' | null = null;
  let currentWidth = 0;
  let pointerX = 0;
  let resizeFrame: number | null = null;

  function applyResize(): void {
    resizeFrame = null;
    if (!dragging) return;
    const rect = $wrapper[0]!.getBoundingClientRect();
    const newWidth =
      dragging === 'right' ? pointerX - rect.left : rect.right - pointerX;
    const width = Math.min(
      MAX_CONTENT_WIDTH,
      Math.max(MIN_CONTENT_WIDTH, Math.round(newWidth)),
    );
    if (width === currentWidth) return;
    currentWidth = width;
    $wrapper[0]!.style.setProperty('--content-max-width', `${currentWidth}px`);
  }

  function onMouseDown(side: 'left' | 'right') {
    return (e: JQuery.MouseDownEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      dragging = side;
      currentWidth = p.uiSettings.contentWidth;
      pointerX = e.clientX;
      $(`.arca-resize-handle-${side}`).addClass('dragging');
    };
  }

  $(document).on('mousemove.arcafeed-resize', (e) => {
    if (!dragging) return;

    pointerX = e.clientX;
    if (resizeFrame === null) resizeFrame = requestAnimationFrame(applyResize);
  });

  $(document).on('mouseup.arcafeed-resize', () => {
    if (!dragging) return;
    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
      applyResize();
    }

    $(`.arca-resize-handle-${dragging}`).removeClass('dragging');
    dragging = null;

    p.uiSettings = { ...p.uiSettings, contentWidth: currentWidth };
    p.flushSave();
  });

  // Create both handles
  for (const side of ['left', 'right'] as const) {
    const $handle = $('<div>', {
      class: `arcafeed-resize-handle arca-resize-handle-${side} swiper-no-swiping`,
    });
    $handle.on('mousedown', onMouseDown(side));
    $wrapper.append($handle);
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
  const $body = $('body');

  // CSS class-based toggles (sync with arcalive.css rules)
  if (!previous || previous.hideScrollbar !== settings.hideScrollbar)
    $('html').toggleClass('hide-scrollbar', settings.hideScrollbar);
  for (const key of Object.keys(bodyClasses) as (keyof typeof bodyClasses)[]) {
    if (!previous || previous[key] !== settings[key])
      $body.toggleClass(bodyClasses[key], settings[key]);
  }

  // Content width (CSS variable on content-wrapper)
  if (!previous || previous.contentWidth !== settings.contentWidth)
    $('.body .content-wrapper').css(
      '--content-max-width',
      `${settings.contentWidth}px`,
    );
}

// ── Mode-specific UI initializers ──────────────────────

function initArticleModeUI(p: VaultAdapter): void {
  $('.nav-control').appendTo('body');

  // Open cross-channel article links in a new tab
  // to avoid disrupting the current slide session.
  $('.included-article-list a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const targetChannelId = extractChannelId(href);
    if (targetChannelId && targetChannelId !== p.href.channelId) {
      $(el).attr('target', '_blank');
      $(el).attr('rel', 'noopener');
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
  $('body').addClass('arcafeed');

  // Wrap navbar for styling (stays in .root-container outside the swiper)
  const $navbar = $('nav.navbar').first();
  if ($navbar.length && !$navbar.parent().hasClass('navbar-wrapper')) {
    $navbar.wrap('<div class="navbar-wrapper swiper-no-swiping"></div>');
  }

  $('.ad.small-ad').prependTo('.sticky-container');

  $('.board-category.hide-scrollbar').addClass('swiper-no-swiping');

  // Apply current UI settings
  applyUISettings(p.uiSettings);

  // In series mode, automatically hide the included article list and btns-board
  $('body').toggleClass('hide-included-article-list', p.isSeriesMode);
  $('body').toggleClass('hide-btns-board', p.isSeriesMode);

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
      $('body').toggleClass(
        'hide-included-article-list hide-btns-board',
        lastSeriesMode,
      );
    }
  });
}

export { initUi };
