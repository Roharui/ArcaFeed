// link

import $ from 'jquery';

import { filterLink } from '@/feature';
import { fetchUrl } from '@/utils/fetch';
import { showToast } from '@/utils/toast';

import type { PromiseFunc } from '@/types';
import type { Vault } from '@/vault';

function getInitialFetchPageUrl(p: Vault, articleId: string): string {
  if (p.isCurrentMode('SCRAP')) {
    return `/u/scrap_list${p.searchQuery}`;
  }

  return `${articleId}${p.searchQuery}`;
}

function getFetchUrl(pageUrl: string): string {
  if (pageUrl.startsWith('http')) {
    const parsedUrl = new URL(pageUrl);
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  }

  return pageUrl;
}

function initFetchArticle(articleId: string): PromiseFunc {
  return async function fetchArticle(p: Vault) {
    let articlePageUrl: string = getInitialFetchPageUrl(p, articleId);
    const basePagePath = p.isCurrentMode('SCRAP') ? '/u/scrap_list' : articleId;
    let filteredLinks: string[] = [];
    let count: number = 0;

    while (count <= 10) {
      const searchUrl = getFetchUrl(articlePageUrl);

      console.log(`Fetching article page: ${searchUrl}`);

      const res = await fetchUrl(`${searchUrl}`);

      const $html = $(res.responseText);

      filteredLinks = filterLink(p, false, $html).filter((ele: string) => {
        return !p.articleList.includes(ele);
      });

      if (filteredLinks.length > 0) {
        console.log(`Fetching Completearticle page: ${articlePageUrl}`);

        p.articleList.push(...filteredLinks);

        if (!p.isCurrentMode('SCRAP')) {
          return p;
        }
      }

      const articlePage = $html.find('.page-item.active');
      const articlePageElement = articlePage.next();

      const tempUrl = articlePageElement.find('a').attr('href');

      if (!tempUrl) {
        console.log('NO ARTICLE PAGE LINK FOUND');

        if (!p.isCurrentMode('SCRAP')) {
          showToast('다음 게시글 탐색에 실패했습니다.');
        }

        if (p.isCurrentMode('SCRAP') && p.isSeriesMode) {
          return initOpenScrapSeriesArticle();
        }

        return p;
      }

      articlePageUrl = tempUrl.startsWith('?')
        ? `${basePagePath}${tempUrl}`
        : tempUrl;

      console.log(
        `No articles found on page ${articlePageUrl}, trying page...`,
      );
      count += 1;
    }

    console.log('Counts Over! No more article pages to fetch.');

    if (!p.isCurrentMode('SCRAP')) {
      showToast('다음 게시글 탐색에 실패했습니다.');
    }

    if (p.isCurrentMode('SCRAP') && p.isSeriesMode) {
      return initOpenScrapSeriesArticle();
    }

    return p;
  };
}

function initOpenScrapSeriesArticle(): PromiseFunc {
  return (p: Vault) => {
    const firstArticleUrl = p.articleList[0];

    if (!firstArticleUrl) {
      return p;
    }

    p.activeIndex = 0;
    p.saveConfig();

    const nextUrl = new URL(firstArticleUrl, window.location.origin);
    nextUrl.search = p.searchQuery;

    if (p.articleKey) {
      nextUrl.searchParams.set('articleKey', p.articleKey);
    }

    window.location.replace(nextUrl.toString());
  };
}

export { initFetchArticle };
