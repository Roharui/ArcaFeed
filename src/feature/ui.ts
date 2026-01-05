import $ from 'jquery';

import type { Vault } from '@/vault';

function initUi(p: Vault): void {
  $('.ad.small-ad').prependTo('.sticky-container');

  if (p.isCurrentMode('ARTICLE')) {
    $('.nav-control').appendTo('body');
  }
}

export { initUi };
