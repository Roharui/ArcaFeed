import { style, styleHide } from 'src/utils/jutils';
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
    style('.btn-wrapper { bottom: 1rem !important; }');
    styleHide('.nav-control');
  },
  hideBanner: () => {
    styleHide('#wall');
  },
  hideCommentForm: () => {
    styleHide('.article-menu.mt-2 > *');
    styleHide('#commentForm');
    styleHide('#comment .title');
    styleHide('#vote');
    styleHide('.article-link');
    styleHide('.sidebar');
  },
};

function init() {
  Object.entries(CONFIG).forEach(([k, v]) => {
    if (!v) return;

    CONFIG_FN[k]();
  });
}

export { init };
