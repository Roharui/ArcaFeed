import $ from 'jquery';

import type { Param } from '@/vault';
import { Helper } from '@/core';
import { nextLinkForce } from './swiper';
import { toggleArticleFilterModal } from './modal';

// Example Button HTML:
// <li class="nav-item dropdown user-menu-parent">
//   <a class="nav-link user-menu-link" href="/u/login?goto=%2Fb%2Fbluearchive" title="Login">
//     <span class="d-none d-sm-inline navbar-top-margin"></span>
//     <span class="ion-person"></span>
//   </a>
// </li>

function createHelperBtn(id: string, icon: string, callback: Function, display = 'block') {
  const btn = $('<li>', {
    class: `nav-item dropdown ${id}`
  });
  const a = $('<a>', {class: 'nav-link', style: "margin: 0 .5rem"});
  const spanMargin = $('<span>', { class: 'd-none d-sm-inline navbar-top-margin' });
  const spanIcon = $('<span>', { class: icon + " h5" });

  a.append(spanMargin);
  a.append(spanIcon);
  
  btn.append(a);
  btn.css('display', display);
  
  btn.on('click', () => callback());

  return btn;
}

function initButton({ v, c }: Param) {
  const slideModeToRender = createHelperBtn(
    'refresh',
    'ion-ios-refresh',
    () => {
      Helper.runPromise(({ c }: Param) => {
        c.slideMode = c.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';

        $('.refresh').hide();
        $('.play').show();

        return { c } as Param;
      });
    },
    c.slideMode === 'REFRESH' ? 'block' : 'none',
  );
  const slideModeToRefresh = createHelperBtn(
    'play',
    'ion-ios-play',
    () => {
      Helper.runPromise(({ c }: Param) => {
        c.slideMode = c.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';

        $('.refresh').show();
        $('.play').hide();

        return { c } as Param;
      });
    },
    c.slideMode === 'RENDER' ? 'block' : 'none',
  );
  const nextPageBtn = createHelperBtn('next', 'ion-ios-arrow-forward', () =>
    Helper.runPromise(nextLinkForce),
  );

  const filterPageBtn = createHelperBtn(
    'filter',
    'ion-ios-gear',
    toggleArticleFilterModal,
  );
  
  const fullScreen = createHelperBtn(
    'play',
    'ion-ios-monitor',
    () => document.documentElement.requestFullscreen(),
    c.slideMode === 'RENDER' ? 'block' : 'none',
  );

  const btns: JQuery<HTMLElement>[] = [];

  if (v.isCurrentMode('CHANNEL')) {
    btns.push(filterPageBtn);
  }
  if (v.isCurrentMode('ARTICLE')) {
    btns.push(slideModeToRender, slideModeToRefresh, fullScreen);
  }

  btns.forEach((btn) => {
    $('.navbar-nav').last().prepend(btn);
  });
  
}

export { initButton };