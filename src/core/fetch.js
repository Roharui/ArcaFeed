// link

import { Vault } from './vault';

export class FetchManager extends Vault {
  async fetchFromCurrentSlide(mode) {
    const searchUrl =
      this.currentSlide.attr('data-article-href') + this.searchQuery;

    console.log(`Fetching ${mode} article From Current article: ${searchUrl}`);

    const res = await this.fetchUrl(searchUrl);
    const $html = $(res.responseText);

    this.parseFromArticleList(mode, $html);
  }

  parseFromArticleList(mode, $html) {
    const $content = ($html || $('.root-container')).find(
      'div.included-article-list',
    );

    const totalLinks = $content
      .find(
        'div.included-article-list > div.article-list > div.list-table.table > a.vrow.column',
      )
      .not('.notice');

    const filteredLinks = this.filterLink(totalLinks);

    if (filteredLinks.length === 0) {
      this.addPromiseCurrent(this.fetchLoop.bind(this, mode));
      return;
    }

    const index = filteredLinks.findIndex((ele) =>
      ele.includes(currentArticleId),
    );

    if (index === -1) {
      this.addPromiseCurrent(this.fetchLoop.bind(this, mode));
      return;
    }

    const articeList =
      mode === 'next'
        ? filteredLinks.slice(index + 1)
        : filteredLinks.slice(0, index - 1);

    if (articeList.length === 0) {
      this.addPromiseCurrent(this.fetchLoop.bind(this, mode));
      return;
    }

    console.log(`Fetching Complete ${mode} article page: ${searchUrl}`);

    if (mode === 'next') {
      this.articleList.push(...articeList);
      this.nextArticleUrl = articeList[0];
    } else {
      this.articleList.unshift(...articeList);
      this.prevArticleUrl = articeList.slice(-1)[0];
    }
  }

  async fetchLoop(mode) {
    let filteredLinks = [];
    let url = null;
    let count = 0;

    let $html = this.currentSlide || $('.root-container');

    while (url === null && count <= 10) {
      const articlePage = $html.find('.page-item.active');

      const articlePageElement =
        mode === 'next' ? articlePage.next() : articlePage.prev();

      const articlePageUrl = articlePageElement.find('a').attr('href');

      if (!articlePageUrl) return;

      const searchUrl = articlePageUrl.replace('https://arca.live', '');

      console.log(`Fetching ${mode} article page: ${searchUrl}`);

      const res = await this.fetchUrl(`${searchUrl}`);

      $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = this.filterLink(totalLinks);

      if (filteredLinks.length > 0) {
        url = mode === 'next' ? filteredLinks[0] : filteredLinks.slice(-1)[0];
      }

      if (url !== null) {
        console.log(
          `Fetching Complete ${mode} article page: ${articlePageUrl}`,
        );

        if (mode === 'prev') {
          this.articleList.unshift(...filteredLinks);
          this.prevArticleUrl = url;
        } else {
          this.articleList.push(...filteredLinks);
          this.nextArticleUrl = url;
        }

        return;
      }
      count += 1;

      console.log(
        `No articles found on page ${articlePageUrl}, trying ${mode} page...`,
      );
    }
  }

  fetchUrl(url, method = 'GET', ms = 5000) {
    if (process.env.NODE_ENV === 'development') {
      return GM.xmlHttpRequest({
        method: method,
        url: `https://arca.live${url}`,
        headers: { Origin: 'arca.live' },
        timeout: ms,
      });
    } else {
      return fetch(url, {
        method: method,
        headers: { Origin: 'arca.live' },
        timeout: ms,
      })
        .then((response) => response.text())
        .then((text) => ({ responseText: text }));
    }
  }
}
