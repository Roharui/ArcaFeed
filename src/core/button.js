import { Vault } from './vault';

function createHelperBtn(icon, callback, display = 'block') {
  const btn = $('<div>', {
    class: 'helper-btn',
    style: `display: ${display};`,
  });
  btn.append($('<span>', { class: icon }));

  btn.on('click', callback);

  return btn;
}

function btnWrapper(cls, content) {
  const btnWrapperDiv = $('<div>', { class: cls });

  content.reverse().forEach((btn) => {
    btnWrapperDiv.append(btn);
  });

  return btnWrapperDiv;
}

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
      },
      this.slideMode === 'REFRESH' ? 'block' : 'none',
    );
    const slideModeToRefresh = createHelperBtn(
      'ion-ios-play',
      () => {
        this.toggleSlideMode();
        $('.helper-btn .ion-ios-refresh').parent().show();
        $('.helper-btn .ion-ios-play').parent().hide();
      },
      this.slideMode === 'RENDER' ? 'block' : 'none',
    );
    const showCommentModal = createHelperBtn('ion-chatboxes', () =>
      this.doHide('Comment'),
    );
    const showArticleList = createHelperBtn('ion-link', () =>
      this.doHide('List'),
    );
    const nextPageBtn = createHelperBtn('ion-ios-arrow-forward', () =>
      this.nextLinkForce(),
    );
    const filterPageBtn = createHelperBtn('ion-ios-gear', () =>
      this.openArticleFilterModal(),
    );

    const btns = [];

    if (this.mode === 'ARTICLE') {
      btns.push(showArticleList);
      btns.push(showCommentModal);
      btns.push(slideModeToRender);
      btns.push(slideModeToRefresh);
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
