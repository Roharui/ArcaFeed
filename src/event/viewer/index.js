import { Vault } from 'src/vault';

const v = new Vault();

function showViewer() {
  v.runViewer((g) => g.show());
}

function hideViewer() {
  v.runViewer((g) => g.hide());
}

function toggleViewer() {
  v.runViewer((g) => {
    v.isViewerActive() ? g.hide() : g.show();
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
  ' ': nextImage,
  ArrowDown: moveDown,
  ArrowUp: moveUp,
  '/': fitScreen,
  Shift: hideViewer,
};

export { VIEWER_EVENT, showViewer, toggleViewer, fitScreen };
