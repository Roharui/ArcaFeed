export class HideManager {
  initHide() {
    if (this.mode === 'ARTICLE' && this.articleId) {
      this.doHide();
    }
  }

  doHide() {
    if (this.mode !== 'ARTICLE') return;
    if (this.currentShow === 'Article') {
      $('#comment').hide();

      $('.article-list').hide();
      $('.included-article-list').hide();
      $('.btns-board').hide();

      $('.article-wrapper > div').not('#comment').show();
    } else if (this.currentShow === 'Comment') {
      $('.article-wrapper > div').not('#comment').hide();

      $('.article-list').hide();
      $('.included-article-list').hide();
      $('.btns-board').hide();

      $('#comment').show();
    } else if (this.currentShow === 'List') {
      $('.article-wrapper > div').not('#comment').hide();
      $('#comment').hide();

      $('.btns-board').show();
      $('.article-list').show();
      $('.included-article-list').show();
    }
    $('html, body').animate({ scrollTop: 0 }, 'slow');
  }

  toggleComment() {
    if (this.currentShow === 'Comment') {
      this.currentShow = 'Article';
    } else {
      this.currentShow = 'Comment';
    }
    this.doHide();
  }

  toggleArticleList() {
    if (this.currentShow === 'List') {
      this.currentShow = 'Article';
    } else {
      this.currentShow = 'List';
    }
    this.doHide();
  }
}
