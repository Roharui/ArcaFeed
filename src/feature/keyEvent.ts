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

const initEvent = (p: VaultAdapter) => {
  initDisableInputEvent(p);
  if (p.isCurrentMode('CHANNEL')) {
    initChannelEvent(p);
  } else if (p.isCurrentMode('ARTICLE')) {
    initArticleEvent(p);
  }
};

export { initEvent };
