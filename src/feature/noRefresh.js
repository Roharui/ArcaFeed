import { Vault } from 'src/vault';

import { render } from './render';
import { getArticleId, getChannelId } from 'src/utils/url';

function noRefrershLink() {
  if (getChannelId()) {
    if ($('.article-wrapper').length < 1) {
      $('.board-article-list').attr('class', 'article-view');
      $('.board-title').after($('<div>', { class: 'article-wrapper' }));
    }

    if ($('.included-article-list').length < 1) {
      const articleList = $('.article-view .clearfix').nextAll().clone();
      $('.article-view .clearfix').nextAll().remove();

      const included = $('<div>', { class: 'included-article-list' }).append(
        articleList,
      );
      $('.article-view .clearfix').after(included);
    }
  }

  $('a.vrow.column, a.page-link, .board-category a, .btns-board a').on(
    'click',
    function (e) {
      e.preventDefault();
      const href = $(this).attr('href');

      new Vault().setLastArticle(getArticleId(href), true);
      render(href);
    },
  );
}

export { noRefrershLink };
