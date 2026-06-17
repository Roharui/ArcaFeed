import $ from 'jquery';

import type { Vault } from '@/vault';

function initUi(p: Vault): void {
  $('body').addClass('arcafeed');

  $('.ad.small-ad').prependTo('.sticky-container');

  $('.board-category.hide-scrollbar').addClass('swiper-no-swiping');

  if (p.isSeriesMode) {
    $('div.included-article-list').hide();
    $('div.btns-board').hide();
  }

  if (p.isCurrentMode('ARTICLE')) {
    $('.nav-control').appendTo('body');
  }
}

export { initUi };
