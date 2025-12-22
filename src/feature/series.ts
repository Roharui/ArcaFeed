// import $ from 'jquery';

// import { checkNotNull, wrapperFunction } from '@/utils';

// import type { Param, VaultFull } from '@/vault';
// import { ArcaFeed } from '@/core';

// type SeriesLink = {
//   idx: number;
//   url: string;
//   element: HTMLElement;
// };

// // 페이지가 로드된 후 실행
// function initSeriesContentFeature({ v }: Param): void | Param {
//   const { currentSlide } = v as VaultFull;

//   const $html = $(currentSlide);

//   // article-series 요소들이 2개 이상이면 첫 번째를 제외한 나머지 삭제
//   const articleSeriesElements = $html.find('.article-series');

//   if (articleSeriesElements.length === 0) {
//     return; // article-series 요소가 없으면 종료
//   }

//   if (articleSeriesElements.length > 1) {
//     articleSeriesElements.last().remove();
//   }

//   // 현재 페이지 URL
//   const currentPageUrl = window.location.pathname;
//   const links = $html.find('.article-series').find('.series-link');

//   const allSeriesLinks = getCurrentSeriesLink(links);
//   const currentIndex = allSeriesLinks.findIndex(({ url }) =>
//     url.includes(currentPageUrl),
//   );

//   // 시리즈 바로가기 링크 저장 변수
//   const shortCutLink: SeriesLink[] = [];
//   const shortCutLinkCount = 5;

//   // 전편과 후편 찾기 (대안 포함)
//   if (currentIndex === -1) {
//     return;
//   }

//   if (allSeriesLinks.length < shortCutLinkCount) {
//     createShortcutSeriesDiv(allSeriesLinks.slice(), $html);
//     return;
//   }

//   // 현재 인덱스에서부터 양쪽으로 shortCutLinkCount 개수만큼 링크를 선택
//   let idx = currentIndex;
//   let direction = -1;
//   let swap = -1;

//   for (let i = 0; i < shortCutLinkCount; i++) {
//     idx += (swap < 0 ? i : 1) * direction; // 현재 인덱스에 방향과 스왑 적용

//     // 인덱스가 범위를 벗어나면 종료
//     if (idx < 0 || idx >= allSeriesLinks.length) {
//       direction *= -1; // 방향 전환
//       swap = 1;
//       idx += (i + 1) * direction; // 방향 전환 후 인덱스 조정
//     }

//     shortCutLink.push(checkNotNull(allSeriesLinks[idx]));
//     direction *= swap; // 방향 전환
//   }

//   // shortCutLink의 인덱스 순서대로 정렬
//   shortCutLink.sort((a, b) => a?.idx - b?.idx);

//   // 새로운 shortcut article-series div 생성
//   createShortcutSeriesDiv(shortCutLink, $html);
// }

// const initSeriesContent = wrapperFunction(
//   ['ARTICLE'],
//   initSeriesContentFeature,
// );

// function getCurrentSeriesLink(links: JQuery<HTMLElement>): SeriesLink[] {
//   return links
//     .toArray()
//     .map((seriesDiv: HTMLElement, index: number) => {
//       const link = $(seriesDiv).find('a');
//       const href: string = link.attr('href') || '';

//       if (link) {
//         // target="_blank" 속성 제거
//         link.attr('target', '');

//         // rel="noopener" 등의 속성도 제거 (새탭 관련)
//         link.attr('rel', '');

//         return {
//           idx: index,
//           url: href,
//           element: seriesDiv,
//         };
//       }

//       return null;
//     })
//     .filter((e): e is SeriesLink => !!e);
// }

// // shortCutLink를 이용해 새로운 article-series div 생성 및 추가
// function createShortcutSeriesDiv(
//   shortCutLinks: SeriesLink[],
//   $html: JQuery<HTMLElement>,
// ) {
//   // article-body 요소 찾기
//   const articleBody = $html.find('.article-body');

//   if (!articleBody) {
//     return;
//   }

//   // 새로운 article-series div 생성
//   const shortcutDiv = $('<div>');

//   shortcutDiv.addClass('article-series');
//   shortcutDiv.css('max-height', 'max-content');
//   shortcutDiv.css('margin-top', '1rem');

//   // shortCutLink의 각 링크를 series-link div로 생성
//   shortCutLinks.forEach((linkData) => {
//     shortcutDiv.append($(linkData.element).clone());
//   });

//   // article-body에 추가 (맨 앞에 추가)
//   articleBody.append(shortcutDiv);
// }

// function initSeriesLinkBtnFeature({ c }: Param) {
//   const seriesNameEle = $('.article-series').prev();
//   const seriesName = seriesNameEle.text();

//   if (seriesName === c.seriesName) {
//     seriesNameEle.css('color', 'green');
//   } else {
//     seriesNameEle.css('color', 'blue');
//   }

//   seriesNameEle.on('click', () => ArcaFeed.runPromise(initLinkThisSeries));
// }

// const initSeriesLinkBtn = wrapperFunction(
//   ['ARTICLE', 'SLIDE'],
//   initSeriesLinkBtnFeature,
// );

// function initLinkThisSeriesFeature({ v, c }: Param) {
//   const { currentSlide } = v as VaultFull;

//   const $html = $(currentSlide);

//   const seriesNameEle = $html.find('.article-series').prev();
//   const seriesName = seriesNameEle.text();

//   // article-series 요소들이 2개 이상이면 첫 번째를 제외한 나머지 삭제
//   const articleSeriesElement = $html.find('.article-series').first();
//   const articleSeriesElementLinks = articleSeriesElement.find('.series-link');

//   const allSeriesLinks: string[] = getCurrentSeriesLink(
//     articleSeriesElementLinks,
//   ).map(({ url }) => url);

//   c.articleList = allSeriesLinks;
//   c.seriesName = seriesName;

//   window.location.reload();
// }

// const initLinkThisSeries = wrapperFunction(
//   ['SLIDE'],
//   initLinkThisSeriesFeature,
// );

// export { initSeriesContent, initSeriesLinkBtn };
