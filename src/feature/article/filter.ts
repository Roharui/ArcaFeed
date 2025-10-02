class FilterManager {
  filterLink(rows: JQuery<HTMLElement>): string[] {
    const { articleList, articleFilterConfig } = vault.config;

    const articleFilter = articleFilterConfig[vault.href.channelId];
    const articleListString = articleList.join(',');

    let resultRows = rows.toArray();

    if (articleFilter) {
      resultRows = resultRows.filter((ele) => {
        const _tabTypeText = $(ele).find('.badge-success').text();
        const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

        const titleText = $(ele).find('.title').text().trim();

        const tabAllow = articleFilter.tab.includes(tabTypeText);
        const titleAllow = articleFilter.title.every(
          (keyword) => !titleText.includes(keyword),
        );

        const result = tabAllow && titleAllow;

        if (!result) $(ele).css('opacity', '0.5');
        else $(ele).css('opacity', '1');

        return result;
      });
    }

    return resultRows
      .map((ele) => $(ele).attr('href') || '')
      .map((href) => href.replace('https://arca.live', ''))
      .map((href) => href.replace(/\?.+$/, ''))
      .filter(
        (href) =>
          articleListString.indexOf(this.getArticleIdFromHref(href)) === -1,
      );
  }

  parseSearchQuery() {
    const searchParams = new URLSearchParams(this.search);

    searchParams.delete('p');
    searchParams.delete('near');
    searchParams.delete('after');
    searchParams.delete('before');
    searchParams.delete('tz');

    this.searchQuery = searchParams.toString();
    this.searchQuery = this.searchQuery ? `?${this.searchQuery}` : '';
  }
}

export { FilterManager };
