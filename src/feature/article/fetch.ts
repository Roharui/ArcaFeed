// link

import $ from 'jquery';

import { fetchUrl } from "@/utils/fetch";
import { getCurrentSlide, filterLink } from "@/feature";

import type { PageMode, PromiseFunc } from '@/types';
import type { Param } from '@/vault';


function fetchArticle(mode: PageMode): PromiseFunc {
  return ({ v }: Param) => {
    if (!v.swiper) return fetchLoop(mode, $(".root-container"));
    return fetchFromCurrentSlide(mode);
  }
}

// 현재 슬라이드에서 게시글 링크를 검색
function fetchFromCurrentSlide(mode: PageMode): PromiseFunc {
  return async ({ v, c }: Param): Promise<PromiseFunc> => {
    const { searchQuery } = c;
    const currentSlide = $(v.currentSlide || getCurrentSlide(v));

    const searchUrl =
      currentSlide.attr('data-article-href') + searchQuery;

    console.log(`Fetching ${mode} article From Current article: ${searchUrl}`);

    const res = await fetchUrl(searchUrl);
    const $html = $(res.responseText);

    return fetchLoop(mode, $html);
  }
}

function fetchLoop(mode: PageMode, $html: JQuery<HTMLElement>): PromiseFunc {
  return async ({ v, c }: Param): Promise<void | Param> => {
    let filteredLinks: string[] = [];
    let url: string | undefined;
    let count: number = 0;

    while (!url && count <= 10) {
      const articlePage = $html.find('.page-item.active');

      const articlePageElement =
        mode === 'NEXT' ? articlePage.next() : articlePage.prev();

      const articlePageUrl = articlePageElement.find('a').attr('href');

      if (!articlePageUrl) {
        console.log("NO ARTICLE PAGE LINK FOUND")
        return;
      }

      const searchUrl = articlePageUrl.replace('https://arca.live', '');

      console.log(`Fetching ${mode} article page: ${searchUrl}`);

      const res = await fetchUrl(`${searchUrl}`);

      $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = filterLink(totalLinks, v, c);

      if (filteredLinks.length > 0) {
        url = mode === 'NEXT' ? filteredLinks[0] : filteredLinks.slice(-1)[0];
      }

      if (!!url) {
        console.log(
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

      console.log(
        `No articles found on page ${articlePageUrl}, trying ${mode} page...`,
      );
    }
  }
}

export { fetchArticle }
