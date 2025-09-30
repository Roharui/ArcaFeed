import { sleep } from 'src/utils/sleep';
import { Vault } from './vault';

export class HideManager extends Vault {
  doHide(mode) {
    if (this.mode !== 'ARTICLE') return;

    const $check = $('.swiper');

    let $html = $('.swiper-slide-active');

    if ($check.length === 0) {
      $html = $('.root-container').parent();
    } else if ($html.length === 0) {
      this.addPromiseCurrent(
        () => sleep(100),
        () => this.doHide(mode),
      );
      return;
    }

    let currentShow = mode || 'Article';
    const previousShow = $html.attr('data-show') || 'NONE';

    if (previousShow === currentShow) currentShow = 'Article';

    if (currentShow === 'Article') {
      $html.find('#comment').hide();

      $html.find('.article-list').hide();
      $html.find('.included-article-list').hide();
      $html.find('.btns-board').hide();

      $html.find('.article-wrapper > div').not('#comment').show();

      $html.attr('data-show', 'Article');
    } else if (currentShow === 'Comment') {
      $html.find('.article-wrapper > div').not('#comment').hide();

      $html.find('.article-list').hide();
      $html.find('.included-article-list').hide();
      $html.find('.btns-board').hide();

      $html.find('#comment').show();

      $html.attr('data-show', 'Comment');
    } else if (currentShow === 'List') {
      $html.find('.article-wrapper > div').not('#comment').hide();
      $html.find('#comment').hide();

      $html.find('.btns-board').show();
      $html.find('.article-list').show();
      $html.find('.included-article-list').show();

      $html.attr('data-show', 'List');
    }
  }
}
