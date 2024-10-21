import { fitScreen, toggleViewer } from 'src/event/viewer';
import { toggleFullScreen } from 'src/utils/fullscreen';
import { initConfigModal, nextPageConfigModal } from 'src/utils/modal';
import { toPage } from 'src/utils/toPage';
import { getArticleId } from 'src/utils/url';
import { Vault } from 'src/vault';

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

  if (v.config.btn.navExpand) {
    firstLine.append(refresh);

    if (location.href.includes('/b/')) {
      firstLine.append(pageModalBtn);

      secondLine.append(fullScreenBtn);

      if (getArticleId() !== undefined) {
        secondLine.append(imageViewBtn);
        secondLine.append(imageFitWidth);
      }
    }
  }

  firstLine.append(settingModalBtn);

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
      const g = v.gallery;
      if (g != null && (g.showing || g.isShown || g.showing)) {
        v.runViewer((g) => g.prev());
      } else {
        toPage(false);
      }
    },
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      const g = v.gallery;
      if (g != null && (g.showing || g.isShown || g.showing)) {
        v.runViewer((g) => g.hide());
      }
      toPage(false);
      return false;
    },
  );

  const nextBtn = createPageBtn(
    'ion-android-arrow-forward',
    () => {
      const g = v.gallery;
      if (g != null && (g.showing || g.isShown || g.showing)) {
        v.runViewer((g) => g.next());
      } else {
        toPage(true);
      }
    },
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      const g = v.gallery;
      if (g != null && (g.showing || g.isShown || g.showing)) {
        v.runViewer((g) => g.hide());
      }
      toPage(true);
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
