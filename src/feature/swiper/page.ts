// hider, regex, slide, link, hider

import $ from 'jquery'

import { SlideManager } from '@/feature/swiper/slide';

import { doHide } from "@/feature/hider";
import { getArticleId, getCurrentHTMLTitle, parseContent } from '@/feature/regex';

import type { PageMode, PromiseFunc } from "@/types";
import type { Config, Vault } from "@/vault";

import { isNotNull, isString } from "@/utils/type";
import { fetchUrl } from '@/utils/fetch';
import { sleep } from '@/utils/sleep';
import type { LinkManager } from '../article';

class PageManager extends SlideManager {
  l: LinkManager;

  constructor(v: Vault, c: Config, l: LinkManager) {
    super(v, c);
    this.l = l;
  }

  init(): PromiseFunc[] {
    return [this.initSlide.bind(this), this.initPage.bind(this)]
  }

  initPage(v: Vault): Vault {
    this.v = v || this.v;

    const { swiper: _swiper } = this.v;
    const swiper = isNotNull(_swiper);

    swiper.on('slideNextTransitionEnd', () => {
      this.toLink('NEXT');
    });

    swiper.on('slidePrevTransitionEnd', () => {
      this.toLink('NEXT');
    });

    return v;
  }

  nextLinkForce() {
    if (!isString(this.v.nextArticleUrl)) {
      throw Error("No Next Article Url")
    }
    window.location.href = this.v.nextArticleUrl;
  }

  toLink(mode: PageMode) {
    const { nextArticleUrl, prevArticleUrl } = this.v;
    const url = mode === 'NEXT' ? nextArticleUrl : prevArticleUrl;

    if (!isString(url))
      return;

    if (this.c.isSlideMode('REFRESH'))
      window.location.replace(url);
    else this.pageRender(mode);
  }

  getCurrentSlide() {
    const { swiper } = this.v;
    const { slides, activeIndex } = isNotNull(swiper);

    return isNotNull(slides[activeIndex])
  }

  pageRender(mode: PageMode): PromiseFunc[] {
    if (isString(mode === 'NEXT' ? this.v.nextArticleUrl : this.v.prevArticleUrl)) {
      return []
    }
    if (!this.v.swiper) {
      return [];
    }

    const { swiper } = this.v;
    const { slides, activeIndex } = swiper;

    const promiseList = [];
    const currentSlide = isNotNull(slides[activeIndex])

    if (
      (mode === 'NEXT' && activeIndex !== 0) ||
      (mode === 'PREV' && activeIndex !== slides.length - 1)
    ) {
      promiseList.push(() => swiper.disable());
      promiseList.push(() => (swiper.allowTouchMove = false));
      promiseList.push(() => this.alertPageIsFetching(mode));
      promiseList.push(() => this.linkPageRender(mode));
      promiseList.push(() => doHide('Article'));
      promiseList.push(() => this.showCurrentSlide());
      promiseList.push(() => swiper.enable());
      promiseList.push(() => this.removeSlidePromise(mode));
      promiseList.push(() => this.addNewEmptySlidePromise(mode));
      promiseList.push(() => (swiper.allowTouchMove = true));
    }
    promiseList.push(() => this.setCurrentArticle());
    promiseList.push(() => this.l.initArticleLinkActive());

    promiseList.push(() => currentSlide.focus());

    return promiseList
  }

  alertPageIsFetching(mode: PageMode) {
    $(this.getCurrentSlide())
      .find('.loading-info')
      .append(
        $('<div>').text(
          `${mode === 'NEXT' ? '다음' : '이전'} 글 불러오는 중...`,
        ),
      );
  }

  setCurrentArticle() {

    const currentSlide = this.getCurrentSlide()
    const $currentSlide = $(currentSlide)

    const currentArticleUrl = $currentSlide.attr('data-article-href');
    const currentArticleTitle = isNotNull($currentSlide.attr('data-article-title'));

    document.title = currentArticleTitle;
    window.history.pushState({}, currentArticleTitle, currentArticleUrl);
  }

  showCurrentSlide() {
    const currentSlide = $(this.getCurrentSlide())
    currentSlide.find('.loader-container').remove();
    currentSlide.removeClass('slide-empty');
  }

  // 로직 정리
  // 1. 다음 슬라이드가 빈 슬라이드면 다음 글 불러오기
  // 2. 다음 글을 불러온 후 빈 슬라이드에 추가 (display: none)
  // 3. 블러온 글에 대한 hider 처리 진행
  // 4. 슬라이드 갱신
  async linkPageRender(mode: PageMode) {
    let res;

    const { nextArticleUrl, prevArticleUrl } = this.v;

    const url = isNotNull(mode === 'NEXT' ? nextArticleUrl : prevArticleUrl)

    while (!res) {
      res = await fetchUrl(url);

      if (!res) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetch failed, no loop for development mode');
          return;
        }

        $(this.getCurrentSlide())
          .find('.loading-info')
          .append($('<div>').text('글 불러오기 실패'));

        await sleep(5000);
        continue;
      }
    }

    const content = parseContent(res.responseText);
    const title = getCurrentHTMLTitle(res.responseText);

    const $article = $(content);

    const currentArticleId = getArticleId(url);

    const currentSlide = $(this.getCurrentSlide())

    currentSlide.append($article);

    currentSlide.attr('data-article-id', currentArticleId);
    currentSlide.attr('data-article-href', url);
    currentSlide.attr('data-article-title', title);
  }
}

export { PageManager }
