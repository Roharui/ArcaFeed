export async function fetchLoopNext() {
  let url = null;
  let $html = $(document);
  let count = 0;

  while (url === null && count <= 10) {
    const nextArticlePageUrl = $html
      .find('.page-item.active')
      .next()
      .find('a')
      .attr('href');

    const res = await fetchUrl(`https://arca.live${nextArticlePageUrl}`);
    $html = $(res.responseText);
    const totalLinks = $html
      .find('div.article-list > div.list-table.table > a.vrow.column')
      .not('.notice');

    const filteredLinks = this.filterLink(totalLinks);
    if (filteredLinks.length > 0) {
      url = filteredLinks[0];
    }

    if (url !== null) {
      this.nextArticleUrl = url;
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
