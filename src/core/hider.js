export class HideManager {
  initHide() {
    if (this.mode !== 'ARTICLE') return;
    this.doHide();
  }

  doHide() {
    if (this.mode !== 'ARTICLE') return;

    const [$html, currentShow] = this.getCurrentHtml();

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

  toggleComment() {
    const [$html, currentShow] = this.getCurrentHtml();

    if (currentShow === 'Comment') $html.attr('current-show', 'Article');
    else $html.attr('current-show', 'Comment');
    this.doHide();
  }

  toggleArticleList() {
    const [$html, currentShow] = this.getCurrentHtml();

    if (currentShow === 'List') $html.attr('current-show', 'Article');
    else $html.attr('current-show', 'List');

    this.doHide();
  }

  getCurrentHtml() {
    const $activeSlide = $('.swiper-slide-active');
    const $html = $activeSlide.length
      ? $activeSlide
      : $('.root-container').parent();

    return [$html, $html.attr('current-show') || 'Article'];
  }
}
