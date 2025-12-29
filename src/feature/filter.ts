import $ from 'jquery';

import { getArticleId } from '@/utils';

import type { Vault } from '@/vault';

function filterLink(
  p: Vault,
  css: boolean = false,
  $html?: JQuery<HTMLElement>,
): string[] {
  console.log('Filtering links based on article list and filter config...');

  let rowsLocal = ($html ?? $('.root-container'))
    .find(
      `div.article-list > div.list-table.table > a.vrow.column, 
           div.article-list > div.list-table.hybrid a.title.hybrid-title`,
    )
    .not('.notice');

  const { articleList, articleFilterConfig, href } = p;

  // Use Set for O(1) lookup instead of O(n) indexOf on comma-separated string
  const articleIdSet = new Set(articleList);

  const articleFilter = articleFilterConfig[href.channelId];
  const { tab: tabFilter, title: titleFilter } = articleFilter || {
    tab: [],
    title: [],
  };

  let resultRows: { $ele: JQuery<HTMLElement>; result: boolean }[] = [];

  if (!!articleFilter && tabFilter.length + titleFilter.length > 0) {
    // Cache tab filter set for faster lookups
    const tabFilterSet = new Set(tabFilter);

    resultRows = rowsLocal.toArray().map(function (ele) {
      const $ele = $(ele);

      const _tabTypeText = $ele.find('.badge-success').text();
      const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

      const titleText = $ele.find('.title').text().trim();

      const tabAllow = tabFilterSet.has(tabTypeText);
      const titleAllow = titleFilter.every(
        (keyword) => !titleText.includes(keyword),
      );

      const result = tabAllow && titleAllow;

      return { $ele, result };
    });
  } else {
    resultRows = rowsLocal
      .toArray()
      .map((ele) => ({ $ele: $(ele), result: true }));
  }

  return resultRows
    .filter(({ $ele, result }) => {
      if (css) $ele.css('opacity', result ? '1' : '0.5');
      return result;
    })
    .map(({ $ele }) => $ele.attr('href'))
    .filter((href) => !!href)
    .map((href) => href!.replace('https://arca.live', '').replace(/\?.+$/, ''))
    .filter((href) => !articleIdSet.has(getArticleId(href)));
}

export { filterLink };
