import $ from 'jquery';

import type { Param } from '@/vault';
import type { HrefImpl } from '@/types';

import { ArcaFeed } from '@/core';

import { nextLinkForce } from './swiper';
import { toggleArticleFilterModal } from './modal';

// Example Button HTML:
// <li class="nav-item dropdown user-menu-parent">
//   <a class="nav-link user-menu-link" href="/u/login?goto=%2Fb%2Fbluearchive" title="Login">
//     <span class="d-none d-sm-inline navbar-top-margin"></span>
//     <span class="ion-person"></span>
//   </a>
// </li>

function createArcaFeedBtn(
  id: string,
  icon: string,
  callback: Function,
  display = 'list-item',
) {
  const btn = $('<li>', {
    class: `nav-item dropdown userscript-nav-item ${id}`,
  });
  const a = $('<a>', { class: 'nav-link' });
  const spanMargin = $('<span>', {
    class: 'd-none d-sm-inline navbar-top-margin',
  });
  const spanIcon = $('<span>', { class: icon + ' h5' });

  a.append(spanMargin);
  a.append(spanIcon);

  btn.append(a);
  btn.css('display', display);

  btn.on('click', () => callback());

  return btn;
}

function btnWrapper(btn: JQuery<HTMLElement>[]): JQuery<HTMLElement> {
  const ul = $('<ul>', { class: 'nav navbar-nav userscript-nav' });

  btn.forEach((b) => ul.append(b));

  return ul;
}

function returnButtons(
  currentMode: HrefImpl['mode'],
  slideMode: 'REFRESH' | 'RENDER',
): JQuery<HTMLElement> {
  const btns: JQuery<HTMLElement>[] = [];

  const slideModeToRender = createArcaFeedBtn(
    'refresh',
    'ion-ios-refresh',
    () => {
      ArcaFeed.runPromise(({ c }: Param) => {
        c.slideMode = c.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';

        $('.refresh').hide();
        $('.play').show();

        return { c } as Param;
      });
    },
    slideMode === 'REFRESH' ? 'list-item' : 'none',
  );
  const slideModeToRefresh = createArcaFeedBtn(
    'play',
    'ion-ios-play',
    () => {
      ArcaFeed.runPromise(({ c }: Param) => {
        c.slideMode = c.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';

        $('.refresh').show();
        $('.play').hide();

        return { c } as Param;
      });
    },
    slideMode === 'RENDER' ? 'list-item' : 'none',
  );

  const nextPageBtn = createArcaFeedBtn('next', 'ion-ios-arrow-forward', () =>
    ArcaFeed.runPromise(nextLinkForce),
  );

  const filterPageBtn = createArcaFeedBtn(
    'filter',
    'ion-ios-gear',
    toggleArticleFilterModal,
  );

  if (currentMode === 'CHANNEL') {
    btns.push(filterPageBtn, nextPageBtn);
  }
  if (currentMode === 'ARTICLE') {
    btns.push(slideModeToRender, slideModeToRefresh);
  }

  return btnWrapper(btns);
}

function initButton({ v, c }: Param) {
  const btns = returnButtons(v.href.mode, c.slideMode);

  $('ul.nav.navbar-nav').last().before(btns);
}

function initButtonAtSlide(currentSlide: JQuery<HTMLElement>) {
  const btns = returnButtons('ARTICLE', 'RENDER');

  currentSlide.find('ul.nav.navbar-nav').last().before(btns);
}

export { initButton, initButtonAtSlide };
