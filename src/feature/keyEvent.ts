import $ from 'jquery';

import type { Param } from '@/vault';

import { nextLinkForce } from '@/feature/swiper';
import { wrapperFunction } from '@/utils';
import { ArcaFeed } from '@/core';

function initChannelEventFeature(_: Param): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') ArcaFeed.runPromise(nextLinkForce);
  });
}

function initArticleEventFeature(_: Param): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight') ArcaFeed.runEvent('toNextPage');
    else if (e.key === 'ArrowLeft') ArcaFeed.runEvent('toPrevPage');
  });
}

const initEvent = (_: Param) => {
  const w1 = wrapperFunction(['CHANNEL'], initChannelEventFeature);
  const w2 = wrapperFunction(['ARTICLE', 'SWIPER'], initArticleEventFeature);
  return [w1, w2];
};

export { initEvent };
