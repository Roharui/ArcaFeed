import Viewer from '@viewerjs';

const IMG_FILTER = function (image) {
  return (
    !image.className.includes('twemoji') &&
    !image.className.includes('arca-emoticon') &&
    !image.alt.includes('Spoiler ALERT!') &&
    !image.style.cssText.includes('width: 0px;')
  );
};

const DEFAULT_VIEWER_SETTING = {
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
  transition: false,
  filter: IMG_FILTER,
};

const VaultGallery = (superClass) =>
  class extends superClass {
    constructor() {
      super();

      this.viewerConfig = {
        isFitScreen: this.config.viewer.fitScreen,
        navbar: this.config.viewer.viewerNav,
      };
    }

    setGallery() {
      const article = $('.article-content')
        .find('img')
        .filter((_, ele) => IMG_FILTER(ele));

      if (article.length == 0) {
        this.gallery = null;
        return;
      }

      this.gallery = new Viewer(
        document.querySelector('.article-body'),
        Object.assign(DEFAULT_VIEWER_SETTING, this.viewerConfig),
      );
    }

    isViewerActive() {
      const gallery = this.gallery;
      return (
        gallery !== null &&
        (gallery.showing || gallery.isShown || gallery.showing)
      );
    }

    runViewer(f) {
      if (this.gallery == null) return;
      f(this.gallery);
    }
  };

export { VaultGallery };
