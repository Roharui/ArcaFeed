// link

import $ from 'jquery';

import { filterLink } from '@/feature';
import { fetchUrl } from '@/utils/fetch';

import type { PromiseFunc } from '@/types';
import type { Param } from '@/vault';

function initFetchArticle(articleId: string): PromiseFunc {
  return async function fetchArticle({ v, c }: Param) {
    let articlePageUrl: string = articleId + c.searchQuery;
    let filteredLinks: string[] = [];
    let count: number = 0;

    while (count <= 10) {
      const searchUrl = articlePageUrl.replace('https://arca.live', '');

      console.log(`Fetching article page: ${searchUrl}`);

      const res = await fetchUrl(`${searchUrl}`);

      const $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = filterLink(totalLinks, v, c).filter((ele: string) => {
        return !c.articleList.includes(ele);
      });

      if (filteredLinks.length > 0) {
        console.log(`Fetching Completearticle page: ${articlePageUrl}`);

        c.articleList.push(...filteredLinks);

        return { v, c } as Param;
      }

      const articlePage = $html.find('.page-item.active');
      const articlePageElement = articlePage.next();

      const tempUrl = articlePageElement.find('a').attr('href');

      if (!tempUrl) {
        console.log('NO ARTICLE PAGE LINK FOUND');
        return { v, c } as Param;
      }

      articlePageUrl = tempUrl;

      console.log(
        `No articles found on page ${articlePageUrl}, trying page...`,
      );
      count += 1;
    }

    console.log('Counts Over! No more article pages to fetch.');

    return { v, c } as Param;
  };
}

export { initFetchArticle };
