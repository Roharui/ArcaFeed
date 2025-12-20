// link

import $ from 'jquery';

import { fetchUrl as initFetchUrl } from '@/utils/fetch';
import { filterLink } from '@/feature';

import type { PageMode, PromiseFunc } from '@/types';
import type { Param, VaultWithSwiper } from '@/vault';

import { wrapperFunction } from '@/utils';
import { ArcaFeed } from '@/core';

function initFetchArticle(mode: PageMode): PromiseFunc {
  const result = ({ v }: Param) => {
    if (!v.swiper) return initFetchLoop(mode, $('.root-container'));
    return initFetchFromCurrentSlide(mode);
  };
  return Object.defineProperty(result, 'name', {
    value: `initFetchArticle${mode}`,
  });
}

// 현재 슬라이드에서 게시글 링크를 검색
function initFetchFromCurrentSlideFeature(mode: PageMode): PromiseFunc {
  const result = async ({ v, c }: Param): Promise<PromiseFunc> => {
    const { searchQuery } = c;
    const currentSlide = $((v as VaultWithSwiper).currentSlide);

    const searchUrl = currentSlide.attr('data-article-href') + searchQuery;

    if (process.env.NODE_ENV === 'development') {
      ArcaFeed.log(
        `Fetching ${mode} article From Current article: ${searchUrl}`,
      );
    }

    const res = await initFetchUrl(searchUrl);
    const $html = $(res.responseText);

    return initFetchLoop(mode, $html);
  };
  return Object.defineProperty(result, 'name', {
    value: `initFetchFromCurrentSlide${mode}`,
  });
}

const initFetchFromCurrentSlide = (mode: PageMode) =>
  wrapperFunction(['SLIDE'], initFetchFromCurrentSlideFeature(mode));

function initFetchLoop(
  mode: PageMode,
  $html: JQuery<HTMLElement>,
): PromiseFunc {
  const result = async ({ v, c }: Param): Promise<void | Param> => {
    let filteredLinks: string[] = [];
    let url: string | undefined;
    let count: number = 0;

    v.nextArticleUrl = v.nextArticleUrl || '';
    v.prevArticleUrl = v.prevArticleUrl || '';

    while (!url && count <= 10) {
      const articlePage = $html.find('.page-item.active');

      const articlePageElement =
        mode === 'NEXT' ? articlePage.next() : articlePage.prev();

      const articlePageUrl = articlePageElement.find('a').attr('href');

      if (!articlePageUrl) {
        ArcaFeed.log('NO ARTICLE PAGE LINK FOUND');
        return;
      }

      const searchUrl = articlePageUrl.replace('https://arca.live', '');

      ArcaFeed.log(`Fetching ${mode} article page: ${searchUrl}`);

      const res = await initFetchUrl(`${searchUrl}`);

      $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = filterLink(totalLinks, v, c);

      if (filteredLinks.length > 0) {
        url = mode === 'NEXT' ? filteredLinks[0] : filteredLinks.slice(-1)[0];
      }

      if (!!url) {
        ArcaFeed.log(
          `Fetching Complete ${mode} article page: ${articlePageUrl}`,
        );

        if (mode === 'PREV') {
          c.articleList.unshift(...filteredLinks);
          v.prevArticleUrl = url || '';
        } else if (mode === 'NEXT') {
          c.articleList.push(...filteredLinks);
          v.nextArticleUrl = url || '';
        }

        return { v, c } as Param;
      }
      count += 1;

      ArcaFeed.log(
        `No articles found on page ${articlePageUrl}, trying ${mode} page...`,
      );
    }
  };
  return Object.defineProperty(result, 'name', {
    value: `initFetchLoop${mode}`,
  });
}

export { initFetchArticle };
