export async function fetchLoopNext(helper) {
  let url = null;
  let $html = $(document);
  let count = 0;

  while (url === null && count <= 3) {
    const nextArticlePageUrl = $html
      .find('.page-item.active')
      .next()
      .find('a')
      .attr('href');

    console.log('NEXT', nextArticlePageUrl);

    const res = await fetchUrl(`https://arca.live${nextArticlePageUrl}`);
    $html = $(res.responseText);
    const totalLinks = $html
      .find('div.article-list > div.list-table.table > a.vrow.column')
      .not('.notice');

    const filteredLinks = helper.filterLink(totalLinks);
    if (filteredLinks.length > 0) {
      url = filteredLinks[0];
    }

    if (url !== null) {
      console.log('NEXT URL', url);
      helper.nextArticleUrl = url;
      return;
    }
    count += 1;
  }
}

export async function fetchLoopPrev(helper) {
  let url = null;
  let $html = $(document);
  let count = 0;

  while (url === null && count <= 3) {
    const prevArticlePageUrl = $html
      .find('.page-item.active')
      .prev()
      .find('a')
      .attr('href');

    if (!prevArticlePageUrl) return;

    const res = await fetchUrl(`https://arca.live${prevArticlePageUrl}`);
    $html = $(res.responseText);
    const totalLinks = $html
      .find('div.article-list > div.list-table.table > a.vrow.column')
      .not('.notice');

    const filteredLinks = helper.filterLink(totalLinks);
    if (filteredLinks.length > 0) {
      url = filteredLinks[filteredLinks.length - 1];
    }

    if (url !== null) {
      helper.prevArticleUrl = url;
      return;
    }
    count += 1;
  }
}

export async function fetchUrl(url, method = 'GET') {
  return GM.xmlHttpRequest({
    method: method,
    url: url,
  });
}
