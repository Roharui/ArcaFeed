import $ from 'jquery';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

function initDisableInputEvent(_: VaultAdapter): void {
  $('input, textarea').on('keydown', function (e) {
    e.stopPropagation();
  });
}

function initChannelEvent(_: VaultAdapter): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') eventBus.emit('toNextLinkForce');
  });
}

function initArticleEvent(_: VaultAdapter): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') eventBus.emit('toNextPage');
    else if (e.key === 'ArrowLeft') eventBus.emit('toPrevPage');
  });
}

const MODE_KEY_HANDLERS: Record<string, (p: VaultAdapter) => void> = {
  CHANNEL: initChannelEvent,
  ARTICLE: initArticleEvent,
};

const initEvent = (p: VaultAdapter) => {
  initDisableInputEvent(p);
  MODE_KEY_HANDLERS[p.href.mode]?.(p);
};

export { initEvent };
