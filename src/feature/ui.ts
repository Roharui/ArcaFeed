import $ from 'jquery';

import type { VaultAdapter } from '@/vault';

function initUi(p: VaultAdapter): void {
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

  // Reactive: subscribe to series mode changes to toggle UI elements
  p.subscribe((state) => {
    const $articleList = $('div.included-article-list');
    const $btnsBoard = $('div.btns-board');

    if (state.isSeriesMode) {
      $articleList.hide();
      $btnsBoard.hide();
    } else {
      $articleList.show();
      $btnsBoard.show();
    }
  });
}

export { initUi };
