import { render } from 'src/utils/render';
import { getChannelId } from 'src/utils/url';
import { Vault } from 'src/vault';

const v = new Vault();

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
      render($(this).attr('href'));
    },
  );
}

export { noRefrershLink };
