import $ from 'jquery';

import { extractChannelId } from '@/utils';

import type { VaultAdapter } from '@/vault';
import type { UISettings } from '@/types';

// ── Resize handle (PC only) ────────────────────────────

const MIN_CONTENT_WIDTH = 700;
const MAX_CONTENT_WIDTH = 1400;

function clampContentWidth(width: number): number {
  return Math.min(
    MAX_CONTENT_WIDTH,
    Math.max(MIN_CONTENT_WIDTH, Math.round(width)),
  );
}

function installResizeHandle(p: VaultAdapter): void {
  const shouldInstall =
    window.matchMedia('(min-width: 1024px)').matches &&
    !window.matchMedia('(pointer: coarse)').matches &&
    p.isCurrentMode('CHANNEL', 'ARTICLE');
  if (!shouldInstall) return;

  const $wrapper = $('.body .content-wrapper');
  if (!$wrapper.length) return;
  if ($wrapper.find('.arcafeed-resize-handle').length > 0) return;

  $wrapper.css('position', 'relative');

  // Shared drag state
  let dragging: 'left' | 'right' | null = null;
  let currentWidth = 0;
  let pendingClientX = 0;
  let resizeFrame: number | null = null;

  function applyPendingResize(): void {
    resizeFrame = null;
    if (!dragging) return;

    const rect = $wrapper[0]!.getBoundingClientRect();
    const newWidth =
      dragging === 'right'
        ? pendingClientX - rect.left
        : rect.right - pendingClientX;

    currentWidth = clampContentWidth(newWidth);
    $wrapper.css('--content-max-width', `${currentWidth}px`);
    $wrapper
      .find('.arcafeed-resize-handle')
      .attr('aria-valuenow', currentWidth.toString());
  }

  function scheduleResize(clientX: number): void {
    pendingClientX = clientX;
    if (resizeFrame !== null) return;
    resizeFrame = window.requestAnimationFrame(applyPendingResize);
  }

  function onMouseDown(side: 'left' | 'right') {
    return (e: JQuery.MouseDownEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      dragging = side;
      currentWidth = p.uiSettings.contentWidth;
      pendingClientX = e.clientX;
      $(`.arca-resize-handle-${side}`).addClass('dragging');
    };
  }

  // Rebinding is safe if the host replaces the content wrapper without a
  // full navigation.
  $(document)
    .off('.arcafeed-resize')
    .on('mousemove.arcafeed-resize', (event) => {
      if (dragging) scheduleResize(event.clientX);
    })
    .on('mouseup.arcafeed-resize', () => {
      if (!dragging) return;
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
        applyPendingResize();
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
      role: 'separator',
      tabindex: '0',
      'aria-label': '콘텐츠 너비 조절',
      'aria-orientation': 'vertical',
      'aria-valuemin': MIN_CONTENT_WIDTH.toString(),
      'aria-valuemax': MAX_CONTENT_WIDTH.toString(),
      'aria-valuenow': p.uiSettings.contentWidth.toString(),
    });
    $handle
      .on('mousedown.arcafeed-resize', onMouseDown(side))
      .on('keydown.arcafeed-resize', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

        event.preventDefault();
        const delta = event.key === 'ArrowRight' ? 20 : -20;
        const nextWidth = clampContentWidth(p.uiSettings.contentWidth + delta);
        p.uiSettings = { ...p.uiSettings, contentWidth: nextWidth };
        $wrapper.css('--content-max-width', `${nextWidth}px`);
        $wrapper
          .find('.arcafeed-resize-handle')
          .attr('aria-valuenow', nextWidth.toString());
        p.flushSave();
      });
    $wrapper.append($handle);
  }
}

// ── UI Settings ─────────────────────────────────────────

function applyUISettings(settings: UISettings): void {
  const $body = $('body');
  const $html = $('html');

  // CSS class-based toggles (sync with arcalive.css rules)
  $html.toggleClass('hide-scrollbar', settings.hideScrollbar);
  $body.toggleClass('hide-blur', settings.hideBlur);
  $body.toggleClass('hide-nav-control', settings.hideNavControl);
  $body.toggleClass('hide-article-title', settings.hideArticleTitle);
  $body.toggleClass('hide-article-author', settings.hideArticleAuthor);
  $body.toggleClass('hide-article-time', settings.hideArticleTime);
  $body.toggleClass('hide-article-view', settings.hideArticleView);

  // Content width (CSS variable on content-wrapper)
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

// ── Init ────────────────────────────────────────────────

function initUi(p: VaultAdapter): void {
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
}

export { initUi };
