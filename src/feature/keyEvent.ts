import $ from 'jquery';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

const KEYDOWN_EVENT = 'keydown.arcafeed-navigation';
const EDITABLE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[role="button"]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

function shouldIgnoreNavigation(event: JQuery.KeyDownEvent): boolean {
  const nativeEvent = event.originalEvent as KeyboardEvent | undefined;
  if (
    event.isDefaultPrevented() ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    nativeEvent?.repeat ||
    nativeEvent?.isComposing ||
    $('#arcafeed-dialog').length > 0
  ) {
    return true;
  }

  const target = event.target;
  return (
    target instanceof Element && $(target).closest(EDITABLE_SELECTOR).length > 0
  );
}

function initChannelEvent(): void {
  $(document).on(KEYDOWN_EVENT, (event) => {
    if (shouldIgnoreNavigation(event) || event.key !== 'ArrowRight') return;

    event.preventDefault();
    void eventBus.emit('toNextLinkForce');
  });
}

function initArticleEvent(): void {
  $(document).on(KEYDOWN_EVENT, (event) => {
    if (shouldIgnoreNavigation(event)) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      void eventBus.emit('toNextPage');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      void eventBus.emit('toPrevPage');
    }
  });
}

const MODE_KEY_HANDLERS: Record<string, () => void> = {
  CHANNEL: initChannelEvent,
  ARTICLE: initArticleEvent,
};

const initEvent = (p: VaultAdapter) => {
  // Re-initialization can happen after UI changes. Remove only ArcaFeed's
  // namespaced handler so a page always has exactly one navigation listener.
  $(document).off(KEYDOWN_EVENT);
  MODE_KEY_HANDLERS[p.href.mode]?.();
};

export { initEvent };
