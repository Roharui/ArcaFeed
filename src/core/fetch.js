import { sleep } from 'src/utils/sleep';

export class FetchManager {
  async fetchLoopNext() {
    let filteredLinks = [];
    let url = null;
    let $html = $('.root-container').last();
    let count = 0;

    while (url === null && count <= 10) {
      const nextArticlePageUrl = $html
        .find('.page-item.active')
        .next()
        .find('a')
        .attr('href');

      console.log(`Fetching next article page: ${nextArticlePageUrl}`);

      const res = await this.fetchUrl(`https://arca.live${nextArticlePageUrl}`);

      $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = this.filterLink(totalLinks);
      if (filteredLinks.length > 0) {
        url = filteredLinks[0];
      }

      if (url !== null) {
        console.log(
          `Fetching Complete next article page: ${nextArticlePageUrl}`,
        );
        this.articleList.push(...filteredLinks);
        this.nextArticleUrl = url;
        return;
      }
      count += 1;

      console.log(
        `No articles found on page ${nextArticlePageUrl}, trying next page...`,
      );
    }
  }

  async fetchLoopPrev() {
    let filteredLinks = [];
    let url = null;
    let $html = $('.root-container').first();
    let count = 0;

    while (url === null && count <= 10) {
      const prevArticleUrl = $html
        .find('.page-item.active')
        .prev()
        .find('a')
        .attr('href');

      if (!prevArticleUrl) return;

      console.log(`Fetching prev article page: ${prevArticleUrl}`);

      const res = await this.fetchUrl(`https://arca.live${prevArticleUrl}`);

      $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = this.filterLink(totalLinks);
      if (filteredLinks.length > 0) {
        url = filteredLinks[0];
      }

      if (url !== null) {
        console.log(`Fetching Complete prev article page: ${prevArticleUrl}`);
        this.articleList.unshift(...filteredLinks);
        this.prevArticleUrl = url;
        return;
      }
      count += 1;
    }
  }

  fetchUrl(url, method = 'GET', ms = 5000) {
    return GM.xmlHttpRequest({
      method: method,
      url: url,
      headers: { Origin: 'arca.live' },
      timeout: ms,
    });
  }
}
