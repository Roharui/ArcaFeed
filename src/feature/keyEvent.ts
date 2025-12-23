import $ from 'jquery';

import { ArcaFeed } from '@/core';
import { nextLinkForce } from '@/feature/swiper';

import type { Param } from '@/vault';

function initChannelEvent(_: Param): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') ArcaFeed.runPromise(nextLinkForce);
  });
}

function initArticleEvent(_: Param): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') ArcaFeed.runEvent('toNextPage');
    else if (e.key === 'ArrowLeft') ArcaFeed.runEvent('toPrevPage');
  });
}

const initEvent = (p: Param) => {
  const { v } = p;

  if (v.isCurrentMode('CHANNEL')) {
    initChannelEvent(p);
  } else if (v.isCurrentMode('ARTICLE')) {
    initArticleEvent(p);
  }
};

export { initEvent };
