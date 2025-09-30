export class FetchManager {
  async fetchLoop(mode = 'next') {
    let filteredLinks = [];
    let url = null;
    let count = 0;

    const searchUrl = this.articleList[this.currentArticleIndex];

    const _res = await this.fetchUrl(searchUrl);
    let $html = $(_res.responseText);

    while (url === null && count <= 10) {
      const articlePage = $html.find('.page-item.active');

      const articlePageElement =
        mode === 'next' ? articlePage.next() : articlePage.prev();

      const articlePageUrl = articlePageElement.find('a').attr('href');

      if (!articlePageUrl) return;

      console.log(`Fetching ${mode} article page: ${articlePageUrl}`);

      const res = await this.fetchUrl(`https://arca.live${articlePageUrl}`);

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

      if (process.env.NODE_ENV === 'development') {
        console.log('No loop for development mode');
        return;
      }
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
      return fetch(url, { method: method, headers: { Origin: 'arca.live' } })
        .then((response) => response.text())
        .then((text) => ({ responseText: text }));
    }
  }
}
