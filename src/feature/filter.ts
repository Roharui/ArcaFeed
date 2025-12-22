import $ from 'jquery';

import { getArticleId } from '@/utils';

import type { Config, Vault } from '@/vault';

function filterLink(rows: JQuery<HTMLElement>, v: Vault, c: Config): string[] {
  const { articleList, articleFilterConfig } = c;
  const { href } = v;

  const articleFilter = articleFilterConfig[href.channelId];
  // Use Set for O(1) lookup instead of O(n) indexOf on comma-separated string
  const articleIdSet = new Set(articleList);

  let resultRows = rows.toArray();

  if (articleFilter) {
    // Cache tab filter set for faster lookups
    const tabFilterSet = new Set(articleFilter.tab);

    resultRows = resultRows.filter((ele) => {
      const $ele = $(ele); // Cache jQuery object
      const _tabTypeText = $ele.find('.badge-success').text();
      const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

      const titleText = $ele.find('.title').text().trim();

      const tabAllow = tabFilterSet.has(tabTypeText);
      const titleAllow = articleFilter.title.every(
        (keyword) => !titleText.includes(keyword),
      );

      const result = tabAllow && titleAllow;

      // Set opacity directly instead of using css() method
      $ele.css('opacity', result ? '1' : '0.5');

      return result;
    });
  }

  const result: string[] = [];
  for (const ele of resultRows) {
    const r = $(ele).attr('href') as string;
    if (!r) continue;

    const href = r.replace('https://arca.live', '').replace(/\?.+$/, '');
    const articleId = getArticleId(href);

    if (!articleIdSet.has(articleId)) {
      result.push(href);
    }
  }

  return result;
}

export { filterLink };
