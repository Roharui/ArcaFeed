import $ from 'jquery';

import { getArticleId } from '@/utils';

import type { Vault } from '@/vault';

function filterLink(
  rows: JQuery<HTMLElement>,
  p: Vault,
  css: boolean = false,
): string[] {
  console.log('Filtering links based on article list and filter config...');

  const { articleList, articleFilterConfig, href } = p;

  const articleFilter = articleFilterConfig[href.channelId];
  // Use Set for O(1) lookup instead of O(n) indexOf on comma-separated string
  const articleIdSet = new Set(articleList);

  if (articleFilter) {
    // Cache tab filter set for faster lookups
    const tabFilterSet = new Set(articleFilter.tab);

    rows = rows.filter(function () {
      const $ele = $(this); // Cache jQuery object
      const _tabTypeText = $ele.find('.badge-success').text();
      const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

      const titleText = $ele.find('.title').text().trim();

      const tabAllow = tabFilterSet.has(tabTypeText);
      const titleAllow = articleFilter.title.every(
        (keyword) => !titleText.includes(keyword),
      );

      const result = tabAllow && titleAllow;

      if (css) {
        $ele.css('opacity', result ? '1' : '0.5');
      }

      return result;
    });
  }

  return rows
    .map(function () {
      return $(this).attr('href');
    })
    .get()
    .filter((href) => !!href)
    .map((href) => href.replace('https://arca.live', '').replace(/\?.+$/, ''))
    .filter((href) => !articleIdSet.has(getArticleId(href)));
}

export { filterLink };
