import { Vault } from './vault';

export class HideManager extends Vault {
  doHide(mode) {
    if (this.mode !== 'ARTICLE') return;

    const $html = this.currentSlide;

    let currentShow = mode || 'Article';
    const previousShow = $html.attr('data-show') || 'NONE';

    if (currentShow === previousShow) currentShow = 'Article';

    $html.find('.article-wrapper > div').toggle(currentShow === 'Article');
    $html.find('#comment').toggle(currentShow === 'Comment');

    $html.attr('data-show', currentShow);
  }
}
