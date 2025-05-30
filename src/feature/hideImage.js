import { Vault } from 'src/vault';
import { hide, show } from 'src/utils/jutils';

const v = new Vault();

function hideImage() {
  if (v.config.hide.hideOriImg) _hideImage();
}

function _hideImage() {
  $('.article-content')
    .find('img')
    .not('.twemoji')
    .not('.arca-emoticon')
    .hide();
  $('.article-content > p').each((i, ele) => {
    if ($(ele).text().length === 0) {
      $(ele).find('br').hide();
    }
  });
  hide('#defaultImage');
  hide('.spoiler-alert-content');
}

function showImage() {
  $('.article-content')
    .find('img')
    .not('.twemoji')
    .not('.arca-emoticon')
    .show();
  show('.article-content > p > br');
  show('#defaultImage');
  show('.spoiler-alert-content');
}

export { hideImage, showImage };
