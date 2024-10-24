import { style, styleHide } from 'src/utils/jutils';
import { toggleBtn } from '../feature/btn';
import { noRefrershLink } from '../feature/noRefresh';

const GLOBAL_INIT = {
  noRefresh: noRefrershLink,
  toggleBtn: toggleBtn,
  hideControlBtn: () => {
    style('.btn-wrapper { bottom: 1rem !important; }');
    styleHide('.nav-control');
  },
  hideBanner: () => {
    styleHide('#wall');
  },
  hideExtra: () => {
    styleHide('.article-menu.mt-2 > *');
    styleHide('#commentForm');
    styleHide('#comment .title');
    styleHide('#vote');
    styleHide('.article-link');
    styleHide('.sidebar');
    styleHide('.safeframe');
  },
};

function globalInit() {
  Object.entries(GLOBAL_INIT).forEach(([_, v]) => {
    v();
  });
}

export { globalInit };
