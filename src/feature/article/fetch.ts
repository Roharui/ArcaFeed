// link

import $ from 'jquery';

import { fetchUrl } from "@/utils/fetch";
import { getCurrentSlide, filterLink } from "@/feature";

import type { PageMode, PromiseFunc } from '@/types';
import type { Param } from '@/vault';

// 현재 슬라이드에서 게시글 링크를 검색
function fetchFromCurrentSlide(mode: PageMode): PromiseFunc {
  return async ({ v, c }: Param): Promise<void | PromiseFunc> => {
    const { searchQuery } = c;
    const currentSlide = $(v.currentSlide || getCurrentSlide(v))

    if (currentSlide === null) {
      return fetchLoop(mode);
    }

    const searchUrl =
      currentSlide.attr('data-article-href') + searchQuery;

    console.log(`Fetching ${mode} article From Current article: ${searchUrl}`);

    const res = await fetchUrl(searchUrl);
    const $html = $(res.responseText);

    return parseFromArticleList(mode, $html);
  }
}

function parseFromArticleList(mode: PageMode, $html: JQuery<HTMLElement>): PromiseFunc {
  return async ({ v, c }: Param): Promise<void | PromiseFunc> => {

    const { href } = v;
    const currentSlide = $(v.currentSlide || getCurrentSlide(v))

    if (currentSlide === null) {
      return fetchLoop(mode);
    }

    const $content = ($html || $('.root-container')).find(
      'div.included-article-list',
    );

    const totalLinks = $content
      .find(
        'div.included-article-list > div.article-list > div.list-table.table > a.vrow.column',
      )
      .not('.notice');

    const filteredLinks = filterLink(totalLinks, v, c);

    if (filteredLinks.length === 0) {
      return fetchLoop(mode, $html);
    }

    const currentArticleId =
      currentSlide.attr('data-article-id')?.trim() || href.articleId;

    if (!currentArticleId) {
      return fetchLoop(mode, $html);
    }

    const index = filteredLinks.findIndex((ele: string) =>
      ele.includes(currentArticleId),
    );

    if (index === -1) {
      return fetchLoop(mode, $html);
    }

    let articleList: string[] = [];

    if (mode !== 'ALL') {
      articleList =
        mode === 'NEXT'
          ? filteredLinks.slice(index + 1)
          : filteredLinks.slice(0, index - 1);
    }

    if (articleList.length === 0) {
      return fetchLoop(mode, $html);
    }

    if (mode === 'ALL') {
      c.articleList = articleList;
      v.nextArticleUrl = articleList[index + 1] || '';
      v.prevArticleUrl = articleList[index - 1] || '';
    } else if (mode === 'NEXT') {
      c.articleList.push(...articleList);
      v.nextArticleUrl = articleList[0] || '';
    } else if (mode === 'PREV') {
      c.articleList.unshift(...articleList);
      v.prevArticleUrl = articleList.slice(-1)[0] || '';
    }
  }
}

function fetchLoop(mode: PageMode, $slide?: JQuery<HTMLElement>): PromiseFunc {
  return async ({ v, c }: Param): Promise<void> => {

    let filteredLinks: string[] = [];
    let url: string | undefined;
    let count: number = 0;

    let $html = $slide || $('.root-container');

    while (url === null && count <= 10) {
      const articlePage = $html.find('.page-item.active');

      const articlePageElement =
        mode === 'NEXT' ? articlePage.next() : articlePage.prev();

      const articlePageUrl = articlePageElement.find('a').attr('href');

      if (!articlePageUrl) return;

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

      if (url !== null) {
        console.log(
          `Fetching Complete ${mode} article page: ${articlePageUrl}`,
        );

        if (mode === 'PREV') {
          c.articleList.unshift(...filteredLinks);
          v.prevArticleUrl = url || '';
        } else {
          c.articleList.push(...filteredLinks);
          v.nextArticleUrl = url || '';
        }

        return;
      }
      count += 1;

      console.log(
        `No articles found on page ${articlePageUrl}, trying ${mode} page...`,
      );
    }
  }
}

export { fetchFromCurrentSlide }
