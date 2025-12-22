// link

import $ from 'jquery';

import { fetchUrl as initFetchUrl } from '@/utils/fetch';
import { filterLink } from '@/feature';

import type { PageMode, PromiseFunc } from '@/types';
import type { Param, VaultWithSwiper } from '@/vault';

import { getFirstArrayItem, wrapperFunction } from '@/utils';
import { ArcaFeed } from '@/core';

function initFetchArticle({ v }: Param) {
  if (!v.swiper) return initFetchLoop($('.root-container'));
  return initFetchFromCurrentSlide;
}

// 현재 슬라이드에서 게시글 링크를 검색
async function initFetchFromCurrentSlideFeature({
  v,
  c,
}: Param): Promise<PromiseFunc> {
  const { searchQuery } = c;
  const currentSlide = $((v as VaultWithSwiper).currentSlide);

  const searchUrl = currentSlide.attr('data-article-href') + searchQuery;

  ArcaFeed.log(`Fetching article From Current article: ${searchUrl}`);

  const res = await initFetchUrl(searchUrl);
  const $html = $(res.responseText);

  return initFetchLoop($html);
}

const initFetchFromCurrentSlide = wrapperFunction(
  ['SLIDE'],
  initFetchFromCurrentSlideFeature,
);

function initFetchLoop($html: JQuery<HTMLElement>): PromiseFunc {
  const result = async ({ v, c }: Param) => {
    let filteredLinks: string[] = [];
    let count: number = 0;

    while (filteredLinks.length === 0 && count <= 10) {
      const articlePage = $html.find('.page-item.active');

      const articlePageElement = articlePage.next();

      const articlePageUrl = articlePageElement.find('a').attr('href');

      if (!articlePageUrl) {
        ArcaFeed.log('NO ARTICLE PAGE LINK FOUND');
        return { v, c } as Param;
      }

      const searchUrl = articlePageUrl.replace('https://arca.live', '');

      ArcaFeed.log(`Fetching article page: ${searchUrl}`);

      const res = await initFetchUrl(`${searchUrl}`);

      $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = filterLink(totalLinks, v, c);

      if (filteredLinks.length > 0) {
        ArcaFeed.log(`Fetching Completearticle page: ${articlePageUrl}`);

        c.articleList.push(...filteredLinks);
        v.nextArticleUrl = getFirstArrayItem(filteredLinks);

        return { v, c } as Param;
      }
      count += 1;

      ArcaFeed.log(
        `No articles found on page ${articlePageUrl}, trying page...`,
      );
    }
  };
  return Object.defineProperty(result, 'name', {
    value: `initFetchLoop`,
  });
}

export { initFetchArticle };
