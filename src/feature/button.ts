
import $ from "jquery"

import type { Param } from "@/vault";
import { Helper } from "@/core";
import { nextLinkForce } from "./swiper";
import { toggleArticleFilterModal } from "./modal";


function createHelperBtn(icon: string, callback: Function, display = 'block') {
  const btn = $('<div>', {
    class: 'helper-btn',
    style: `display: ${display};`,
  });
  btn.append($('<span>', { class: icon }));

  btn.on('click', () => callback());

  return btn;
}

function btnWrapper(cls: string, content: JQuery<HTMLElement>[]) {
  const btnWrapperDiv = $('<div>', { class: cls });

  content.reverse().forEach((btn) => {
    btnWrapperDiv.append(btn);
  });

  return btnWrapperDiv;
}



function initButton({ v, c }: Param) {
  // const consoleInfo = createHelperBtn('ion-information', () =>
  //   showConsole(),
  //);
  const slideModeToRender = createHelperBtn(
    'ion-ios-refresh',
    () => {
      Helper.runPromise(({ c }: Param) => {
        c.slideMode = c.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';

        $('.helper-btn .ion-ios-refresh').parent().hide();
        $('.helper-btn .ion-ios-play').parent().show();
        $('.helper-btn .ion-ios-monitor').parent().show();

        return { c } as Param;
      })
    },
    c.slideMode === 'REFRESH' ? 'block' : 'none',
  );
  const slideModeToRefresh = createHelperBtn(
    'ion-ios-play',
    () => {
      Helper.runPromise(({ c }: Param) => {
        c.slideMode = c.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';

        $('.helper-btn .ion-ios-refresh').parent().show();
        $('.helper-btn .ion-ios-play').parent().hide();
        $('.helper-btn .ion-ios-monitor').parent().hide();

        return { c } as Param;
      })
    },
    c.slideMode === 'RENDER' ? 'block' : 'none',
  );
  const nextPageBtn = createHelperBtn('ion-ios-arrow-forward', () =>
    Helper.runPromise(nextLinkForce),
  );
  const filterPageBtn = createHelperBtn('ion-ios-gear', toggleArticleFilterModal);
  const fullScreen = createHelperBtn(
    'ion-ios-monitor',
    () => document.documentElement.requestFullscreen(),
    c.slideMode === 'RENDER' ? 'block' : 'none',
  );

  const btns: JQuery<HTMLElement>[] = []

  if (v.isCurrentMode('CHANNEL')) {
    btns.push(nextPageBtn, filterPageBtn)
  }
  if (v.isCurrentMode('ARTICLE')) {
    btns.push(slideModeToRender, slideModeToRefresh, fullScreen)
  }

  $('body').append(btnWrapper('btn-wrapper right', btns));
}

export { initButton }


/*
import { Vault } from './vault';
export class ButtonManager extends Vault {
  initHelperBtn() {
    const consoleInfo = createHelperBtn('ion-information', () =>
      this.showConsole(),
    );
    const slideModeToRender = createHelperBtn(
      'ion-ios-refresh',
      () => {
        this.toggleSlideMode();
        $('.helper-btn .ion-ios-refresh').parent().hide();
        $('.helper-btn .ion-ios-play').parent().show();
        $('.helper-btn .ion-ios-monitor').parent().show();
      },
      this.slideMode === 'REFRESH' ? 'block' : 'none',
    );
    const slideModeToRefresh = createHelperBtn(
      'ion-ios-play',
      () => {
        this.toggleSlideMode();
        $('.helper-btn .ion-ios-refresh').parent().show();
        $('.helper-btn .ion-ios-play').parent().hide();
        $('.helper-btn .ion-ios-monitor').parent().hide();
      },
      this.slideMode === 'RENDER' ? 'block' : 'none',
    );
    const showCommentModal = createHelperBtn('ion-chatboxes', () =>
      this.doHide('Comment'),
    );
    const nextPageBtn = createHelperBtn('ion-ios-arrow-forward', () =>
      this.nextLinkForce(),
    );
    const filterPageBtn = createHelperBtn('ion-ios-gear', () =>
      this.openArticleFilterModal(),
    );
    const fullScreen = createHelperBtn(
      'ion-ios-monitor',
      () => document.documentElement.requestFullscreen(),
      this.slideMode === 'RENDER' ? 'block' : 'none',
    );

    const btns = [];

    if (this.mode === 'ARTICLE') {
      btns.push(showCommentModal);
      btns.push(slideModeToRender);
      btns.push(slideModeToRefresh);

      btns.push(fullScreen);
    }
    if (this.mode === 'CHANNEL') {
      btns.push(nextPageBtn);
      btns.push(filterPageBtn);
    }

    if (process.env.NODE_ENV === 'development') {
      btns.push(consoleInfo);
    }

    $('body').append(btnWrapper('btn-wrapper right', btns));
  }
}
*/
