export async function fetchLoopNext() {
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

    const page = nextArticlePageUrl.match(/(?<=p=)\d+/)[0];

    console.log(`Fetching next article page: ${page}`);

    const res = await fetchUrl(`https://arca.live${nextArticlePageUrl}`);

    $html = $(res.responseText);

    const totalLinks = $html
      .find('div.article-list > div.list-table.table > a.vrow.column')
      .not('.notice');

    filteredLinks = this.filterLink(totalLinks);
    if (filteredLinks.length > 0) {
      url = filteredLinks[0];
    }

    if (url !== null) {
      this.articleList.push(...filteredLinks);
      this.nextArticleUrl = url;
      return;
    }
    count += 1;

    console.log(`No articles found on page ${page}, trying next page...`);
  }
}

export async function fetchLoopPrev() {
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

    const res = await fetchUrl(`https://arca.live${prevArticleUrl}`);

    $html = $(res.responseText);

    const totalLinks = $html
      .find('div.article-list > div.list-table.table > a.vrow.column')
      .not('.notice');

    filteredLinks = this.filterLink(totalLinks);
    if (filteredLinks.length > 0) {
      url = filteredLinks[0];
    }

    if (url !== null) {
      this.articleList.unshift(...filteredLinks);
      this.prevArticleUrl = url;
      return;
    }
    count += 1;
  }
}

export async function fetchUrl(url, method = 'GET') {
  return GM.xmlHttpRequest({
    method: method,
    url: url,
    headers: { Origin: 'arca.live' },
  });
}
