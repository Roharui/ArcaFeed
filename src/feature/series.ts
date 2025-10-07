
import $ from 'jquery'

import { checkNotNull } from '@/utils';
import { getCurrentSlide } from '@/feature';

import type { Param } from '@/vault';
import type { PromiseFunc } from '@/types';

function initSeries({ v }: Param): void | PromiseFunc {
  if (!v.isCurrentMode('ARTICLE')) return;
  return modifySeriesLinks
}

type SeriesLink = {
  idx: number,
  url: string,
  element: HTMLElement
}

// 페이지가 로드된 후 실행
function modifySeriesLinks({ v, c }: Param): void | Param {

  const { currentSlide } = v;

  const $html = $(checkNotNull(currentSlide));
  let ok: boolean = false;

  // article-series 요소들이 2개 이상이면 첫 번째를 제외한 나머지 삭제
  const articleSeriesElements = $html.find('.article-series');

  if (articleSeriesElements.length === 0) {
    return; // article-series 요소가 없으면 종료
  }

  if (articleSeriesElements.length > 1) {
    for (let i = 1; i < articleSeriesElements.length; i++) {
      articleSeriesElements[i]?.remove();
    }
  }

  const seriesName = $html.find('.article-series').prev().text()

  if (c.seriesName.length) {
    ok = confirm("시리즈를 피드에 등록하시겠습니까?");
  }

  if (ok) {
    c.seriesName = seriesName;
  }

  // 현재 페이지 URL
  const currentPageUrl = window.location.href;

  const links = $html.find(".article-series").find(".series-link");
  let currentIndex = -1;

  const allSeriesLinks = links
    .toArray()
    .map((seriesDiv: HTMLElement, index: number) => {
      const link = $(seriesDiv).find("a");
      const href: string = link.attr("href") || ''

      if (link) {
        // 현재 페이지와 일치하는 링크 찾기
        if (href === currentPageUrl || currentPageUrl.includes(href.split('/').pop() || "#@W#@")) {
          currentIndex = index;
        }

        // target="_blank" 속성 제거
        if (link.attr('target')) {
          link.attr('target', '');
        }

        // rel="noopener" 등의 속성도 제거 (새탭 관련)
        if (link.attr('rel')) {
          link.attr('rel', '');
        }

        return {
          idx: index,
          url: href,
          element: seriesDiv
        };
      }

      return null;
    })
    .filter((e): e is SeriesLink => !!e);

  if (ok) {
    c.articleList = allSeriesLinks.map(({ url }) => url)
  }

  // 시리즈 바로가기 링크 저장 변수
  const shortCutLink: SeriesLink[] = [];
  const shortCutLinkCount = 5;

  // 전편과 후편 찾기 (대안 포함)
  if (currentIndex === -1) {
    return;
  }

  if (allSeriesLinks.length < shortCutLinkCount) {
    createShortcutSeriesDiv(allSeriesLinks.slice(), $html);
    return;
  }

  // 현재 인덱스에서부터 양쪽으로 shortCutLinkCount 개수만큼 링크를 선택
  let idx = currentIndex;
  let direction = -1;
  let swap = -1;

  for (let i = 0; i < shortCutLinkCount; i++) {
    idx += ((swap < 0) ? i : 1) * direction; // 현재 인덱스에 방향과 스왑 적용

    // 인덱스가 범위를 벗어나면 종료
    if (idx < 0 || idx >= allSeriesLinks.length) {
      direction *= -1; // 방향 전환
      swap = 1;
      idx += ((i + 1) * direction); // 방향 전환 후 인덱스 조정
    }

    shortCutLink.push(checkNotNull(allSeriesLinks[idx]));
    direction *= swap; // 방향 전환
  }

  // shortCutLink의 인덱스 순서대로 정렬
  shortCutLink.sort((a, b) => a?.idx - b?.idx);

  // 새로운 shortcut article-series div 생성
  createShortcutSeriesDiv(shortCutLink, $html);

  if (ok) return { v, c }
}

// shortCutLink를 이용해 새로운 article-series div 생성 및 추가
function createShortcutSeriesDiv(shortCutLinks: SeriesLink[], $html: JQuery<HTMLElement>) {
  // article-body 요소 찾기
  const articleBody = $html.find('.article-body');

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
    shortcutDiv.append($(linkData.element));
  });

  // article-body에 추가 (맨 앞에 추가)
  articleBody.append(shortcutDiv);
}

export { initSeries }
