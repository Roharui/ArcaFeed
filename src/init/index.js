import { style, hide, remove } from 'src/utils/jutils';
import { toggleBtn } from './btn';
import { noRefrershLink } from './noRefresh';
import { viewInit } from 'src/event/viewer';
import { Vault } from 'src/vault';

const v = new Vault();

const CONFIG = {
  nextPageUrl: true,
  noRefresh: true,
  toggleBtn: false,
  viewer: true,
  hideControlBtn: true,
  hideBanner: true,
  hideCommentForm: true,
};

const CONFIG_FN = {
  noRefresh: noRefrershLink,
  nextPageUrl: () => v.loadArticleUrlList(),
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
  },
};

function init() {
  Object.entries(CONFIG).forEach(([k, v]) => {
    if (!v) return;

    CONFIG_FN[k]();
  });
}

export { init };
