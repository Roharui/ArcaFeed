import { Vault } from './vault';

export class HideManager extends Vault {
  initHide() {
    if (this.mode !== 'ARTICLE') return;
    this.doHide('Article');
  }

  doHide(mode) {
    const $html = this.currentSlide;

    let currentShow = mode || 'Article';
    const previousShow = $html.attr('data-show') || 'NONE';

    if (previousShow === currentShow) currentShow = 'Article';

    if (currentShow === 'Article') {
      $html.find('.article-wrapper > div').show();
      $html.find('#comment').hide();

      $html.attr('data-show', 'Article');
    } else if (currentShow === 'Comment') {
      $html.find('.article-wrapper > div').hide();
      $html.find('#comment').show();

      $html.attr('data-show', 'Comment');
    }
  }
}
