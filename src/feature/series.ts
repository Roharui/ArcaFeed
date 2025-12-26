import $ from 'jquery';

import type { Param } from '@/vault';

type SeriesLink = {
  idx: number;
  url: string;
  element: HTMLElement;
};

// 페이지가 로드된 후 실행
function initSeriesContent(_: Param): void | Param {
  // article-series 요소들이 2개 이상이면 첫 번째를 제외한 나머지 삭제
  const articleSeriesElements = $('.article-series');

  if (articleSeriesElements.length === 0) {
    return; // article-series 요소가 없으면 종료
  }

  articleSeriesElements.last().remove();

  // 현재 페이지 URL
  const currentPageUrl = window.location.pathname;
  const links = articleSeriesElements.first().find('.series-link');

  const allSeriesLinks = getCurrentSeriesLink(links);
  const currentIndex = allSeriesLinks.findIndex(({ url }) =>
    url.includes(currentPageUrl),
  );

  // 시리즈 바로가기 링크 저장 변수
  const shortCutLink: SeriesLink[] = [];
  const shortCutLinkCount = 5;

  // 전편과 후편 찾기 (대안 포함)
  if (currentIndex === -1) {
    return;
  }

  if (allSeriesLinks.length < shortCutLinkCount) {
    createShortcutSeriesDiv(allSeriesLinks.slice());
    return;
  }

  // 현재 인덱스에서부터 양쪽으로 shortCutLinkCount 개수만큼 링크를 선택

  const prevIdx = Math.max(0, currentIndex - 2);

  const seriesLink = shortCutLink.slice().splice(prevIdx, shortCutLinkCount);

  // 새로운 shortcut article-series div 생성
  createShortcutSeriesDiv(seriesLink);
}

function getCurrentSeriesLink(links: JQuery<HTMLElement>): SeriesLink[] {
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

        return {
          idx: index,
          url: href,
          element: seriesDiv,
        };
      }

      return null;
    })
    .filter((e): e is SeriesLink => !!e);
}

// shortCutLink를 이용해 새로운 article-series div 생성 및 추가
function createShortcutSeriesDiv(shortCutLinks: SeriesLink[]) {
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
}

function initLinkThisSeries({ c }: Param) {
  // article-series 요소들이 2개 이상이면 첫 번째를 제외한 나머지 삭제
  const articleSeriesElement = $('.article-series').first();
  const articleSeriesElementLinks = articleSeriesElement.find('.series-link');

  const allSeriesLinks: string[] = getCurrentSeriesLink(
    articleSeriesElementLinks,
  ).map(({ url }) => url);

  c.seriesList = allSeriesLinks;

  return { c } as Param;
}

export { initSeriesContent, initLinkThisSeries };
