import $ from 'jquery';

import type { Vault } from '@/vault';

function initUi(p: Vault): void {
  if (p.isCurrentMode('CHANNEL', 'ARTICLE')) {
    $('.ad.small-ad').prependTo('.sticky-container');
  }

  if (p.isCurrentMode('ARTICLE')) {
    $('.nav-control').appendTo('body');
  }
}

function initCss(p: Vault): void {
  if (p.isCurrentMode('CHANNEL')) {
  }

  if (p.isCurrentMode('ARTICLE')) {
  }
}

export { initUi };
