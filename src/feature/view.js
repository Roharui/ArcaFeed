import { Vault } from 'src/vault';

const v = new Vault();

function viewerInit() {
  v.setGallery();

  if (
    v.gallery !== null &&
    v.config.viewer.defaultStart &&
    $('.article-wrapper').is(':visible')
  ) {
    v.gallery.show();
  }
}

export { viewerInit };
