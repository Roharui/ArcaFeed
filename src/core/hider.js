import { sleep } from 'src/utils/sleep';

export class HideManager {
  doHide(mode) {
    if (this.mode !== 'ARTICLE') return;

    const $check = $('.swiper');

    let $html = $('.swiper-slide-active');

    if ($check.length === 0) {
      $html = $('.root-container');
    } else if ($html.length === 0) {
      this.promiseList.unshift(() => this.doHide(mode));
      this.promiseList.unshift(sleep(100));
      return;
    }

    const currentShow = mode || 'Article';

    if (currentShow === 'Article') {
      $html.find('#comment').hide();

      $html.find('.article-list').hide();
      $html.find('.included-article-list').hide();
      $html.find('.btns-board').hide();

      $html.find('.article-wrapper > div').not('#comment').show();
    } else if (currentShow === 'Comment') {
      $html.find('.article-wrapper > div').not('#comment').hide();

      $html.find('.article-list').hide();
      $html.find('.included-article-list').hide();
      $html.find('.btns-board').hide();

      $html.find('#comment').show();
    } else if (currentShow === 'List') {
      $html.find('.article-wrapper > div').not('#comment').hide();
      $html.find('#comment').hide();

      $html.find('.btns-board').show();
      $html.find('.article-list').show();
      $html.find('.included-article-list').show();
    }
  }
}
