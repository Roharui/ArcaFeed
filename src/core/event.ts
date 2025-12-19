import { PromiseManager } from '@/core/promise';

import { initLink } from '@/feature/article';
import { initSwiper, initPage, initSlide } from '@/feature/swiper';
import {
  initEvent,
  initModal,
  initButton,
  addVersionInfo,
  initSeriesLinkBtn,
  initSeriesContent,
} from '@/feature';

import { checkPageMode, isString, newAllPromise } from '@/utils';
import type { Param } from '@/vault';
import type { PromiseFunc } from '@/types';

class EventManager extends PromiseManager {
  constructor() {
    super();
  }

  init() {
    // this.addNextPromiseCondition([addVersionInfo, () => true]);
    // this.addNextPromiseCondition([checkPageMode, () => true]);
    // this.addNextPromiseCondition([
    //   initSwiper,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED',
    // ]);
    // this.addNextPromiseCondition([
    //   initLink,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED',
    // ]);
    // this.addNextPromiseCondition([
    //   initSlide,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED',
    // ]);
    // this.addNextPromiseCondition([
    //   initSeriesContent,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED',
    // ]);
    // this.addNextPromiseCondition([
    //   initSeriesLinkBtn,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED',
    // ]);
    // this.addNextPromiseCondition([
    //   initPage,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED' && !!v.swiper,
    // ]);
    // this.addNextPromiseCondition([
    //   initButton,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED',
    // ]);
    // this.addNextPromiseCondition([
    //   initEvent,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED' && !!v.swiper,
    // ]);
    // this.addNextPromiseCondition([
    //   initModal,
    //   ({ v }) => v.href.mode !== 'NOT_CHECKED',
    // ]);
    this.addNextPromise(
      addVersionInfo,
      checkPageMode,
      initSwiper,
      initLink,
      initSlide,
      initSeriesContent,
      initSeriesLinkBtn,
      initPage,
      initButton,
      initEvent,
      initModal,
    );
  }

  /*
  // For Event
  // NEXT가 기준
  function toLink(mode: PageMode): PromiseFunc {
    return ({ v, c }: Param): void | PromiseFunc => {
      const { nextArticleUrl } = v;
      const url = nextArticleUrl
  
      if (!isString(url)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('No url at toLink');
        }
        return;
      }
  
      if (c.isSlideMode('REFRESH')) window.location.replace(url);
      else return pageRender(mode);
    };
  }
  
  function pageRender(mode: PageMode): PromiseFunc {
    return ({ v }: Param): PromiseFunc[] => {
      if (!v.swiper) {
        if (process.env.NODE_ENV === 'development') {
          console.log('No Swiper Init');
        }
        return [];
      }
  
      const { swiper } = v;
      const { slides, activeIndex } = swiper;
  
      const promiseList: PromiseFunc[] = [];
  
      promiseList.push(setCurrentSlide);
  
      if (
        (mode === 'NEXT' && activeIndex === slides.length - 1)
      ) {
        promiseList.push(
          newAllPromise(
            () => swiper.disable(),
            () => {
              swiper.allowTouchMove = false;
              return;
            },
            alertPageIsFetching(mode),
          ),
        );
        promiseList.push(linkPageRender(mode));
        promiseList.push(
          newAllPromise(
            showCurrentSlide,
            () => swiper.enable(),
            () => {
              swiper.allowTouchMove = true;
              return;
            },
            removeSlidePromise(mode),
            addNewEmptySlidePromise(mode),
          ),
        );
      }
      promiseList.push(
        newAllPromise(
          setCurrentArticle,
          focusCurrentSlide,
          initArticleLinkActive,
        ),
      );
      promiseList.push(initSeriesContent);
  
      return promiseList;
    };
  }

  */

  renderNextPage() {
    this.addNextPromise(({ v, c }: Param): void | PromiseFunc => {
      const { nextArticleUrl } = v;
      const url = nextArticleUrl;

      if (!isString(url)) {
        this.log('No url at toLink');
        return;
      }

      if (c.isSlideMode('REFRESH')) {
        window.location.replace(url);
        return;
      } else {
        return;
        // return pageRender(mode);
      }
    });
  }

  renderPrevPage() {
    this.addNextPromise(({ v, c }: Param): void | PromiseFunc => {
      const { prevArticleUrl } = v;
      const url = prevArticleUrl;

      if (!isString(url)) {
        this.log('No url at toLink');
        return;
      }

      if (c.isSlideMode('REFRESH')) {
        window.location.replace(url);
        return;
      } else {
        return;
        // return pageRender(mode);
      }
    });
  }
}

export { EventManager };
