import { Vault } from 'src/vault';
import { viewInit } from 'src/event/viewer';
import { getArticleId } from './url';

const v = new Vault();

function render(url) {
  window.history.pushState(null, null, url);

  v.setLastArticle(getArticleId(url));

  const html = v.getHtml(url);

  if (html == undefined) {
    fetch(url)
      .then((res) => res.text())
      .then(renderCallback)
      .then(afterRender);
  } else {
    new Promise((res) => res(renderCallback(html))).then(afterRender);
  }
}

function renderCallback(html) {
  const dom = $(html);

  $('.article-wrapper').toggle(dom.find('.article-wrapper').length > 0);

  $('title').html(dom.find('meta[name=title]').attr('content'));
  $('.article-wrapper').html(dom.find('.article-wrapper').html());

  $('.article-list').html(
    dom
      .find('.article-list')
      .remove('#commentForm')
      .remove('#comment .title')
      .html(),
  );

  $('.board-article-list .pagination-wrapper').html(
    dom.find('.board-article-list .pagination-wrapper').html() ||
      dom.find('.included-article-list .pagination-wrapper').html(),
  );

  $('.included-article-list .pagination-wrapper').html(
    dom.find('.board-article-list .pagination-wrapper').html() ||
      dom.find('.included-article-list .pagination-wrapper').html(),
  );

  $('a.vrow.column, a.page-link, .board-category a, .btns-board a').on(
    'click',
    function (e) {
      e.preventDefault();
      render($(this).attr('href'));
    },
  );

  $('html, body').animate({ scrollTop: 0 }, 200);
}

function afterRender() {
  v.loadArticleUrlList();
  v.setPageUrl();
  viewInit();
}

export { render };
