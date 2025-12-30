import $ from 'jquery';

import type { Vault } from '@/vault';

function initUi(p: Vault): void {
  if (p.isCurrentMode('CHANNEL', 'ARTICLE'))
    $('.ad.small-ad').prependTo('.sticky-container');

  if (p.isCurrentMode('ARTICLE')) $('.nav-control').appendTo('body');
}

export { initUi };
