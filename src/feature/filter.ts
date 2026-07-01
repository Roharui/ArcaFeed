import $ from 'jquery';

import { getArticleId } from '@/utils';

import type { Vault } from '@/vault';

const LEGACY_NO_TAB_CATEGORY = '노탭';
const NO_TAB_CATEGORY_WITHOUT_IMAGE = '노탭(짤X)';
const NO_TAB_CATEGORY_WITH_IMAGE = '노탭(짤O)';

const NO_TAB_CATEGORIES = [
  NO_TAB_CATEGORY_WITHOUT_IMAGE,
  NO_TAB_CATEGORY_WITH_IMAGE,
];

function expandTabCategories(tabCategories: string[]): string[] {
  return [...new Set(
    tabCategories.flatMap((category) =>
      category === LEGACY_NO_TAB_CATEGORY ? NO_TAB_CATEGORIES : [category],
    ),
  )];
}

function getTabTypeText($ele: JQuery<HTMLElement>): string {
  const badgeText = $ele.find('.badge-success').text().trim();

  if (badgeText.length > 0) {
    return badgeText;
  }

  return $ele.find('.media-icon.ion-ios-photos-outline').length > 0
    ? NO_TAB_CATEGORY_WITH_IMAGE
    : NO_TAB_CATEGORY_WITHOUT_IMAGE;
}

function filterLink(
  p: Vault,
  css: boolean = false,
  $html?: JQuery<HTMLElement>,
): string[] {
  console.log('Filtering links based on article list and filter config...');

  let rowsLocal = ($html ?? $('.root-container'))
    .find(
      `div.article-list > div.list-table.table > a.vrow.column, 
           div.article-list > div.list-table.hybrid a.title.hybrid-title,
           div.scrap-list > div.article-list.admin > div.list-table > a.vrow.column`,
    )
    .not('.notice');

  const articleKey = p.href.articleKey;

  if (articleKey) {
    rowsLocal.toArray().forEach((ele) => {
      const $ele = $(ele);
      const href = $ele.attr('href');

      if (!href) return;

      const url = new URL(href, window.location.origin);

      if (url.searchParams.get('articleKey') !== articleKey) {
        url.searchParams.set('articleKey', articleKey);
        $ele.attr('href', `${url.pathname}${url.search}`);
      }
    });
  }

  const { articleList, articleFilterConfig, href } = p;

  // Use Set for O(1) lookup instead of O(n) indexOf on comma-separated string
  const articleIdSet = new Set(articleList);

  const articleFilter = articleFilterConfig[href.channelId];
  const { tab: tabFilter, title: titleFilter } = articleFilter || {
    tab: [],
    title: [],
  };
  const expandedTabFilter = new Set(expandTabCategories(tabFilter));

  let resultRows: { $ele: JQuery<HTMLElement>; result: boolean }[] = [];

  if (!!articleFilter && tabFilter.length + titleFilter.length > 0) {
    resultRows = rowsLocal.toArray().map(function (ele) {
      const $ele = $(ele);

      const tabTypeText = getTabTypeText($ele);

      const titleText = $ele.find('.title').text().trim();

      const tabAllow = expandedTabFilter.has(tabTypeText);
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

export {
  expandTabCategories,
  filterLink,
  getTabTypeText,
  LEGACY_NO_TAB_CATEGORY,
  NO_TAB_CATEGORY_WITH_IMAGE,
  NO_TAB_CATEGORY_WITHOUT_IMAGE,
  NO_TAB_CATEGORIES,
};
