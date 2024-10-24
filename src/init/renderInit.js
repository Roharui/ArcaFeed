import { hideImage } from 'src/feature/hideImage';
import { viewerInit } from 'src/feature/view';
import { Vault } from 'src/vault';

const RENDER_INIT = {
  hideImage: hideImage,
  setPageUrl: () => new Vault().setPageUrl(),
  viewInit: () => viewerInit(),
};

function renderInit() {
  Object.entries(RENDER_INIT).forEach(([_, v]) => {
    v();
  });
}

export { renderInit };
