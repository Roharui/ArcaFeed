import { style, hide, remove } from 'src/utils/jutils';
import { toggleBtn } from './btn';
import { noRefrershLink } from './noRefresh';
import { viewInit } from 'src/event/viewer';
import { Vault } from 'src/vault';

const v = new Vault();

const CONFIG = {
  nextPageUrl: true,
  noRefresh: true,
  toggleBtn: true,
  viewer: true,
  hideControlBtn: true,
  hideBanner: true,
  hideCommentForm: true,
};

const CONFIG_FN = {
  noRefresh: noRefrershLink,
  nextPageUrl: () => v.setPageUrl(),
  toggleBtn: toggleBtn,
  viewer: viewInit,
  hideControlBtn: () => {
    hide('.nav-control');
    style('.btn-wrapper { bottom: 1rem !important; }');
  },
  hideBanner: () => hide('#wall'),
  hideCommentForm: () => {
    remove('#commentForm');
    remove('#comment .title');
    remove('#vote');
    remove('.article-menu.mt-2 > *');
    remove('.article-link');
  },
};

function init() {
  Object.entries(CONFIG).forEach(([k, v]) => {
    if (!v) return;

    CONFIG_FN[k]();
  });
}

export { init };
