import { Vault } from 'src/vault';

import { fitScreen, toggleViewer } from 'src/event/viewer';

import { toggleFullScreen } from './fullscreen';
import { initConfigModal, nextPageConfigModal } from './modal';
import { toNextPage, toPrevPage } from './toPage';

const v = new Vault();

function createPageBtn(icon, callback, contextCallback) {
  const btn = $('<div>', { class: 'helper-btn page-btn' });
  btn.append($('<span>', { class: icon }));

  btn.on('click', callback);
  btn.on('contextmenu', contextCallback);

  return btn;
}

function createHelperBtn(icon, callback) {
  const btn = $('<div>', { class: 'helper-btn' });
  btn.append($('<span>', { class: icon }));

  btn.on('click', callback);

  return btn;
}

function helperBtn() {
  const btnWrapper = $('<div>', { class: 'btn-wrapper' });

  const firstLine = $('<div>', { class: 'btn-line' });
  const secondLine = $('<div>', { class: 'btn-line' });

  const pageModalBtn = createHelperBtn('ion-hammer', nextPageConfigModal);
  const settingModalBtn = createHelperBtn('ion-ios-gear', initConfigModal);
  const fullScreenBtn = createHelperBtn('ion-android-expand', toggleFullScreen);
  const imageViewBtn = createHelperBtn('ion-android-image', toggleViewer);
  const imageFitWidth = createHelperBtn('ion-arrow-resize', fitScreen);
  const refresh = createHelperBtn('ion-ios-refresh-empty', () =>
    location.reload(),
  );
  const navBtnShowAllBtn = createHelperBtn('ion-ios-toggle-outline', () => {
    v.setConfig('btn', {
      navExpand: true,
    });
    toggleBtn();
  });
  const navBtnHideBtn = createHelperBtn('ion-ios-toggle-outline', () => {
    v.setConfig('btn', {
      navExpand: false,
    });
    toggleBtn();
  });

  if (v.config.btn.navExpand) {
    firstLine.append(navBtnHideBtn);
    firstLine.append(refresh);
    if (location.href.includes('/b/')) {
      firstLine.append(pageModalBtn);
      secondLine.append(fullScreenBtn);
      secondLine.append(imageViewBtn);
      secondLine.append(imageFitWidth);
    }
    firstLine.append(settingModalBtn);
  } else {
    firstLine.append(navBtnShowAllBtn);
  }

  btnWrapper.append(secondLine);
  btnWrapper.append(firstLine);

  $('body').append(btnWrapper);
}

function pagenationBtn() {
  if (!location.href.includes('/b/') || !v.config.btn.nextBtn) {
    return;
  }

  const nextBtnWrapper = $('<div>', { class: 'next-btn' });
  const prevBtnWrapper = $('<div>', { class: 'prev-btn' });

  const prevBtn = createPageBtn(
    'ion-android-arrow-back',
    () => {
      if (v.isViewerActive()) {
        v.runViewer((g) => g.prev());
      } else {
        toPrevPage();
      }
    },
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (v.isViewerActive()) {
        v.runViewer((g) => g.hide());
      }
      toPrevPage();
      return false;
    },
  );

  const nextBtn = createPageBtn(
    'ion-android-arrow-forward',
    () => {
      if (v.isViewerActive()) {
        v.runViewer((g) => g.next());
      } else {
        toNextPage();
      }
    },
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (v.isViewerActive()) {
        v.runViewer((g) => g.hide());
      }
      toNextPage();
      return false;
    },
  );

  nextBtnWrapper.append(nextBtn);
  prevBtnWrapper.append(prevBtn);

  $('body').append(nextBtnWrapper);
  $('body').append(prevBtnWrapper);
}

function toggleBtn() {
  $('.btn-wrapper').remove();
  $('.next-btn').remove();
  $('.prev-btn').remove();

  helperBtn();
  pagenationBtn();
}

export { toggleBtn };
