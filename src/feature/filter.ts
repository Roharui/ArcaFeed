
import $ from 'jquery'

import type { Config, Vault } from "@/vault";

import { getArticleId } from "@/utils/regex";

function filterLink(rows: JQuery<HTMLElement>, v: Vault, c: Config): string[] {
  const { articleList, articleFilterConfig } = c;
  const { href } = v

  const articleFilter = articleFilterConfig[href.channelId];
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
        articleListString.indexOf(getArticleId(href)) === -1,
    );
}

export { filterLink };
