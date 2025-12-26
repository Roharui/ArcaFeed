import $ from 'jquery';

import { ArcaFeed } from '@/core';
import { nextLinkForce } from '@/feature';

import type { Vault } from '@/vault';

function initChannelEvent(_: Vault): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') ArcaFeed.runPromise(nextLinkForce);
  });
}

function initArticleEvent(_: Vault): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') ArcaFeed.runEvent('toNextPage');
    else if (e.key === 'ArrowLeft') ArcaFeed.runEvent('toPrevPage');
  });
}

const initEvent = (p: Vault) => {
  if (p.isCurrentMode('CHANNEL')) {
    initChannelEvent(p);
  } else if (p.isCurrentMode('ARTICLE')) {
    initArticleEvent(p);
  }
};

export { initEvent };
