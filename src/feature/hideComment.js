import { Vault } from 'src/vault';
import { hide, show } from 'src/utils/jutils';

const v = new Vault();

function hideComment() {
  if (v.config.hide.hideComment) _hideComment();
}

function _hideComment() {
  hide('#comment');
}

function showComment() {
  show('#comment');
}

export { hideComment, showComment };
