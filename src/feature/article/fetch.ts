// link

import $ from 'jquery';

import { ArcaFeed } from '@/core';
import { getFirstArrayItem } from '@/utils';

import { filterLink } from '@/feature';
import { fetchUrl as initFetchUrl } from '@/utils/fetch';

import type { PromiseFunc } from '@/types';
import type { Param } from '@/vault';

function initFetchArticle(articleId: string): PromiseFunc {
  const result = async ({ v, c }: Param) => {
    let articlePageUrl: string = articleId;
    let filteredLinks: string[] = [];
    let count: number = 0;

    while (count <= 10) {
      const searchUrl = articlePageUrl.replace('https://arca.live', '');

      ArcaFeed.log(`Fetching article page: ${searchUrl}`);

      const res = await initFetchUrl(`${searchUrl}`);

      const $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = filterLink(totalLinks, v, c).filter((ele: string) => {
        return !c.articleList.includes(ele);
      });

      if (filteredLinks.length > 0) {
        ArcaFeed.log(`Fetching Completearticle page: ${articlePageUrl}`);

        c.articleList.push(...filteredLinks);
        v.nextArticleUrl = getFirstArrayItem(filteredLinks);

        return { v, c } as Param;
      }

      const articlePage = $html.find('.page-item.active');
      const articlePageElement = articlePage.next();

      const tempUrl = articlePageElement.find('a').attr('href');

      if (!tempUrl) {
        ArcaFeed.log('NO ARTICLE PAGE LINK FOUND');
        return { v, c } as Param;
      }

      articlePageUrl = tempUrl;

      ArcaFeed.log(
        `No articles found on page ${articlePageUrl}, trying page...`,
      );
      count += 1;
    }

    ArcaFeed.log('Counts Over! No more article pages to fetch.');

    return { v, c } as Param;
  };
  return Object.defineProperty(result, 'name', {
    value: `initFetchArticle`,
  });
}

export { initFetchArticle };
