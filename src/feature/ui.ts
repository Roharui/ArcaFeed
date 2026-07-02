import $ from 'jquery';

import { extractChannelId } from '@/utils';

import type { VaultAdapter } from '@/vault';
import type { UISettings } from '@/types';

// ── Resize handle (PC only) ────────────────────────────

const MIN_CONTENT_WIDTH = 700;
const MAX_CONTENT_WIDTH = 1400;

let resizeHandleInstalled = false;

function installResizeHandle(p: VaultAdapter): void {
  if (resizeHandleInstalled) return;
  if (!window.matchMedia('(min-width: 1024px)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;

  const $wrapper = $('.body .content-wrapper');
  if (!$wrapper.length) return;

  $wrapper.css('position', 'relative');

  // Shared drag state
  let dragging: 'left' | 'right' | null = null;
  let currentWidth = 0;

  function onMouseDown(side: 'left' | 'right') {
    return (e: JQuery.MouseDownEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      dragging = side;
      currentWidth = p.uiSettings.contentWidth;
      $(`.arca-resize-handle-${side}`).addClass('dragging');
    };
  }

  $(document).on('mousemove.arcafeed-resize', (e) => {
    if (!dragging) return;

    const rect = $wrapper[0]!.getBoundingClientRect();

    // Width = distance from cursor to opposite edge of wrapper
    const newWidth =
      dragging === 'right'
        ? e.clientX - rect.left // right handle → distance from left edge
        : rect.right - e.clientX; // left handle  → distance from right edge

    currentWidth = Math.min(
      MAX_CONTENT_WIDTH,
      Math.max(MIN_CONTENT_WIDTH, Math.round(newWidth)),
    );

    $wrapper.css('--content-max-width', `${currentWidth}px`);
  });

  $(document).on('mouseup.arcafeed-resize', () => {
    if (!dragging) return;

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

function applyUISettings(settings: UISettings): void {
  const $body = $('body');
  const $html = $('html');

  // CSS class-based toggles (sync with arcalive.css rules)
  $body.toggleClass('hide-left-sidebar', settings.hideLeftSidebar);
  $html.toggleClass('hide-scrollbar', settings.hideScrollbar);
  $body.toggleClass('hide-blur', settings.hideBlur);
  $body.toggleClass('hide-sidebar', settings.hideSidebar);
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

  // Install resize handle (PC only, once)
  installResizeHandle(p);

  if (p.isCurrentMode('ARTICLE')) {
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

  // Reactive: subscribe to state changes to re-apply UI settings
  p.subscribe((state) => {
    applyUISettings(state.uiSettings);
  });
}

export { initUi };
