import $ from 'jquery';

import '@css/series.css';

import { ArcaFeed } from '@/core';
import { parseSearchQuery } from '@/feature';

import type { Vault } from '@/vault';
import type { PromiseFuncResult } from '@/types';

type SeriesLink = {
  idx: number;
  url: string;
  element: HTMLElement;
};

function getCurrentArticleKey(): string {
  return new URL(window.location.href).searchParams.get('articleKey') || '';
}

function withArticleKey(href: string, articleKey: string): string {
  if (!articleKey) {
    return href;
  }

  const url = new URL(href, window.location.origin);
  url.searchParams.set('articleKey', articleKey);

  return `${url.pathname}${url.search}`;
}

function createArticleKey(): string {
  return (
    window.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) ||
    Math.random().toString(36).slice(2, 10)
  );
}

function getStorageKey(articleKey: string, key: string): string {
  return `arcaFeed:${articleKey}:${key}`;
}

function normalizeArticleList(articleList: string[]): string[] {
  return articleList.map((href) => {
    const url = new URL(href, window.location.origin);

    return url.pathname;
  });
}

function normalizeSearchQuery(searchQuery: string, articleKey: string): string {
  const searchParams = new URLSearchParams(
    searchQuery.startsWith('?') ? searchQuery.slice(1) : searchQuery,
  );

  if (articleKey) {
    searchParams.set('articleKey', articleKey);
  }

  const normalizedSearch = searchParams.toString();

  return normalizedSearch ? `?${normalizedSearch}` : '';
}

function copySeriesStorage(
  sourceArticleKey: string,
  targetArticleKey: string,
  articleList: string[],
  activeIndex: number,
  searchQuery: string,
) {
  const articleFilterConfig = localStorage.getItem(
    getStorageKey(sourceArticleKey, 'articleFilterConfig'),
  );

  if (articleFilterConfig !== null) {
    localStorage.setItem(
      getStorageKey(targetArticleKey, 'articleFilterConfig'),
      articleFilterConfig,
    );
  }

  localStorage.setItem(getStorageKey(targetArticleKey, 'seriesMode'), 'true');

  const normalizedArticleList = normalizeArticleList(articleList);
  const normalizedSearchQuery = normalizeSearchQuery(
    searchQuery,
    targetArticleKey,
  );

  localStorage.setItem(
    getStorageKey(targetArticleKey, 'articleList'),
    JSON.stringify(normalizedArticleList),
  );
  localStorage.setItem(
    getStorageKey(targetArticleKey, 'searchQuery'),
    normalizedSearchQuery,
  );
  localStorage.setItem(
    getStorageKey(targetArticleKey, 'lastActiveIndex'),
    activeIndex.toString(),
  );
}

// 페이지가 로드된 후 실행
function initSeriesContent(_: Vault): PromiseFuncResult {
  // article-series 요소들이 2개 이상이면 첫 번째를 제외한 나머지 삭제
  const articleSeriesElements = $('.article-series');

  if (articleSeriesElements.length === 0) {
    return; // article-series 요소가 없으면 종료
  }

  articleSeriesElements.last().remove();

  // 현재 페이지 URL
  const currentPageUrl = window.location.pathname;
  const links = articleSeriesElements.first().find('.series-link');
  links.css('display', 'block !important');

  $('.series-collapsible').on('click', function () {
    $(this).parent().toggleClass('extend');
  });

  const allSeriesLinks = getCurrentSeriesLink(links);
  const currentIndex = allSeriesLinks.findIndex(({ url }) =>
    url.includes(currentPageUrl),
  );

  // 시리즈 바로가기 링크 저장 변수
  const shortCutLinkCount = 5;

  // 전편과 후편 찾기 (대안 포함)
  if (currentIndex === -1) {
    return;
  }

  if (allSeriesLinks.length < shortCutLinkCount) {
    return createShortcutSeriesDiv(allSeriesLinks.slice());
  }

  // 현재 인덱스에서부터 양쪽으로 shortCutLinkCount 개수만큼 링크를 선택

  const nextIdx = Math.min(allSeriesLinks.length, currentIndex + 2 + 1);
  const prevIdx = Math.max(0, nextIdx - 5);

  const seriesLink = allSeriesLinks.slice().splice(prevIdx, shortCutLinkCount);

  // 새로운 shortcut article-series div 생성
  return createShortcutSeriesDiv(seriesLink);
}

function getCurrentSeriesLink(links: JQuery<HTMLElement>): SeriesLink[] {
  const articleKey = getCurrentArticleKey();

  return links
    .toArray()
    .map((seriesDiv: HTMLElement, index: number) => {
      const link = $(seriesDiv).find('a');
      const href: string = link.attr('href') || '';

      if (link) {
        // target="_blank" 속성 제거
        link.attr('target', '');

        // rel="noopener" 등의 속성도 제거 (새탭 관련)
        link.attr('rel', '');
        link.attr('href', withArticleKey(href, articleKey));

        return {
          idx: index,
          url: withArticleKey(href, articleKey),
          element: seriesDiv,
        };
      }

      return null;
    })
    .filter((e): e is SeriesLink => !!e);
}

// shortCutLink를 이용해 새로운 article-series div 생성 및 추가
function createShortcutSeriesDiv(shortCutLinks: SeriesLink[]) {
  return function showShortcutSeries(v: Vault) {
    // article-body 요소 찾기
    const articleBody = $('.article-body');

    if (!articleBody) {
      return;
    }

    // 새로운 article-series div 생성
    const shortcutDiv = $('<div>');

    shortcutDiv.addClass('article-series');
    shortcutDiv.css('max-height', 'max-content');
    shortcutDiv.css('margin-top', '1rem');

    // shortCutLink의 각 링크를 series-link div로 생성
    shortCutLinks.forEach((linkData) => {
      shortcutDiv.append($(linkData.element).clone());
    });

    // article-body에 추가 (맨 앞에 추가)
    articleBody.append(shortcutDiv);

    if (v.isSeriesMode) {
      return;
    }

    const btns = $('<div>', {
      class: 'series-control-btns',
    });

    const enableSeries = $('<div>', {
      text: '시리즈 바로가기 활성화',
      class: 'series-control-btn enable-series',
    });
    enableSeries.css('opacity', '1');
    enableSeries.on('click', () => ArcaFeed.runEvent('enableSeries'));

    btns.append(enableSeries);

    articleBody.after(btns);
  };
}

function initSeriesBtnCss(v: Vault) {
  $('.series-control-btn.enable-series').css('opacity', '1');
}

function initEnableSeries(p: Vault) {
  // article-series 요소들이 2개 이상이면 첫 번째를 제외한 나머지 삭제
  const articleSeriesElement = $('.article-series').first();
  const articleSeriesElementLinks = articleSeriesElement.find('.series-link');

  const allSeriesLinks: string[] = getCurrentSeriesLink(
    articleSeriesElementLinks,
  ).map(({ url }) => url);

  parseSearchQuery(p);

  const currentActiveIndex =
    Math.max(0, allSeriesLinks.findIndex((url) => url.includes(p.href.articleId)));

  const nextArticleKey = createArticleKey();
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('articleKey', nextArticleKey);

  copySeriesStorage(
    p.articleKey,
    nextArticleKey,
    allSeriesLinks,
    currentActiveIndex,
    p.searchQuery,
  );

  window.open(nextUrl.toString(), '_blank', 'noopener');

  return p;
}

export {
  initSeriesContent,
  initEnableSeries,
  initSeriesBtnCss,
};
