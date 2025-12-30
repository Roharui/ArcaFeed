import $ from 'jquery';

import { ArcaFeed } from '@/core';

import type { Vault } from '@/vault';

const initButton = (p: Vault) => {
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;

  const nextPageBtn = createArcaFeedBtn('next', 'ion-ios-arrow-forward', () =>
    ArcaFeed.runEvent('toNextLinkForce'),
  );

  const filterPageBtn = createArcaFeedBtn('filter', 'ion-ios-gear', () =>
    ArcaFeed.runEvent('showModal'),
  );

  const btns = [];

  if (p.isCurrentMode('CHANNEL')) {
    btns.push(filterPageBtn);
    btns.push(nextPageBtn);
  }

  if (p.isCurrentMode('ARTICLE')) {
    btns.push(filterPageBtn);
  }

  $('ul.nav.navbar-nav').last().before(btnWrapper(btns));
};

// ===

function createArcaFeedBtn(
  id: string,
  icon: string,
  callback: Function,
  display = 'list-item',
) {
  const btn =
    $(`<li class="nav-item dropdown userscript-nav-item ${id}" style="display: ${display};">
  <a class="nav-link">
    <span class="d-none d-sm-inline navbar-top-margin"></span>
    <span class="${icon} h5"></span>
  </a>
  </li>`);

  btn.on('click', () => callback());

  return btn;
}

function btnWrapper(btn: JQuery<HTMLElement>[]): JQuery<HTMLElement> {
  const ul = $('<ul>', { class: 'nav navbar-nav userscript-nav' });

  btn.forEach((b) => ul.append(b));

  return ul;
}

export { initButton };
