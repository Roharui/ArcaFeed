import $ from 'jquery';

import { ArcaFeed } from '@/core';

import { toggleArticleFilterModal, nextLinkForce } from '@/feature';

import type { Vault } from '@/vault';

const initButton = (p: Vault) => {
  if (!p.isCurrentMode('CHANNEL')) return;

  const nextPageBtn = createArcaFeedBtn('next', 'ion-ios-arrow-forward', () =>
    ArcaFeed.runPromise(nextLinkForce),
  );

  const filterPageBtn = createArcaFeedBtn(
    'filter',
    'ion-ios-gear',
    toggleArticleFilterModal,
  );

  $('ul.nav.navbar-nav')
    .last()
    .before(btnWrapper([filterPageBtn, nextPageBtn]));
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
