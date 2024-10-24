import Viewer from '@viewerjs';

import { hide, remove } from 'src/utils/jutils';
import { Vault } from 'src/vault';

let v = new Vault();

function viewInit() {
  let article = $('.article-content')
    .find('img')
    .not('.twemoji')
    .not('.arca-emoticon');

  if (v.config.viewer.hideOriImg) {
    article.hide();
    hide('.article-content > p > br');
    hide('#defaultImage');
    hide('.spoiler-alert-content');
    remove('.safeframe');
  }

  if (article.length == 0) {
    v.setGallery(null);
    return;
  }

  let gallery = new Viewer(document.querySelector('.article-body'), {
    loop: false,
    zoomable: false,
    zoomOnWheel: false,
    moveOnWheel: true,
    tooltip: false,
    button: false,
    toolbar: false,
    title: false,
    navbar: true,
    keyboard: false,
    hideAtEnd: true,
    scalable: false,
    isFitScreen: v.config.viewer.fitScreen,
    filter(image) {
      return (
        !image.className.includes('twemoji') &&
        !image.className.includes('arca-emoticon') &&
        !image.alt.includes('Spoiler ALERT!') &&
        !image.style.cssText.includes('width: 0px;')
      );
    },
  });

  if (v.config.viewer.defaultStart && $('.article-wrapper').is(':visible')) {
    gallery.show();
  }

  v.setGallery(gallery);
}

function showViewer() {
  v.runViewer((g) => g.show());
}

function hideViewer() {
  v.runViewer((g) => g.hide());
}

function toggleViewer() {
  v.runViewer((g) => {
    g.showing || g.isShown || g.showing ? g.hide() : g.show();
  });
}

function nextImage() {
  v.runViewer((g) => g.next());
}

function prevImage() {
  v.runViewer((g) => g.prev());
}

function moveDown(e) {
  e.preventDefault();
  v.runViewer((g) => g.move(0, -30));
}

function moveUp(e) {
  e.preventDefault();
  v.runViewer((g) => g.move(0, 30));
}

function fitScreen() {
  v.runViewer((g) => g.fitScreen());
}

const VIEWER_EVENT = {
  ArrowLeft: prevImage,
  ArrowRight: nextImage,
  ArrowDown: moveDown,
  ArrowUp: moveUp,
  '/': fitScreen,
  Shift: hideViewer,
};

export { VIEWER_EVENT, showViewer, viewInit, toggleViewer, fitScreen };
