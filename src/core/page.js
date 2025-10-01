// hider, regex, slide, link, hider

import { sleep } from 'src/utils/sleep';
import { Vault } from './vault';

export class PageManager extends Vault {
  nextLinkForce() {
    window.location.href = this.nextArticleUrl;
  }

  toLink(mode) {
    if (this.slideMode === 'REFRESH')
      window.location.href =
        mode === 'next' ? this.nextArticleUrl : this.prevArticleUrl;
    else this.pageRender(mode);
  }

  pageRender(mode) {
    if (this.isActive) return;
    if (mode === 'next' && this.nextArticleUrl == null) return;
    if (mode === 'prev' && this.prevArticleUrl == null) {
      alert('이전 글이 없습니다.');
      return;
    }

    const promiseList = [];

    this.currentSlide = $(this.swiper?.slides[this.swiper?.activeIndex]);

    if (
      (mode === 'prev' && this.swiper.realIndex === 0) ||
      (mode === 'next' &&
        this.swiper.realIndex === this.swiper.slides.length - 1)
    ) {
      promiseList.push(() => this.swiper.disable());
      promiseList.push(() => (this.swiper.allowTouchMove = false));
      promiseList.push(() => this.alertPageIsFetching(mode));
      promiseList.push(() => this.linkPageRender(mode));
      promiseList.push(() => this.doHide('Article'));
      promiseList.push(() => this.showCurrentSlide());
      promiseList.push(() => this.swiper.enable());
      promiseList.push(() => this.removeSlidePromise(mode));
      promiseList.push(() => this.addNewEmptySlidePromise(mode));
      promiseList.push(() => (this.swiper.allowTouchMove = true));
    }
    promiseList.push(() => this.setCurrentArticle());
    promiseList.push(() => this.initArticleLinkActive());

    this.addNextPromise(promiseList);
  }

  alertPageIsFetching(mode) {
    this.currentSlide
      .find('.loading-info')
      .append(
        $('<div>').text(
          `${mode === 'next' ? '다음' : '이전'} 글 불러오는 중...`,
        ),
      );
  }

  setCurrentArticle() {
    const currentArticleUrl = this.currentSlide.attr('data-article-href');
    const currentArticleTitle = this.currentSlide.attr('data-article-title');

    document.title = currentArticleTitle;
    window.history.pushState({}, currentArticleTitle, currentArticleUrl);
  }

  showCurrentSlide() {
    this.currentSlide.find('.loader-container').remove();
    this.currentSlide.removeClass('slide-empty');
  }

  // 로직 정리
  // 1. 다음 슬라이드가 빈 슬라이드면 다음 글 불러오기
  // 2. 다음 글을 불러온 후 빈 슬라이드에 추가 (display: none)
  // 3. 블러온 글에 대한 hider 처리 진행
  // 4. 슬라이드 갱신
  async linkPageRender(mode) {
    let res;

    while (!res) {
      res = await this.fetchUrl(
        mode === 'next' ? this.nextArticleUrl : this.prevArticleUrl,
      );

      if (!res) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetch failed, no loop for development mode');
          return;
        }

        this.currentSlide
          .find('.loading-info')
          .append($('<div>').text('글 불러오기 실패'));

        await sleep(5000);
        continue;
      }
    }

    const content = this.parseContent(res.responseText);
    const title = res.responseText
      .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
      .trim();

    const $article = $(content);

    const currentArticleId = this.getArticleIdFromHref(
      mode === 'next' ? this.nextArticleUrl : this.prevArticleUrl,
    );

    this.currentSlide.append($article);

    this.currentSlide.attr('data-article-id', currentArticleId);
    this.currentSlide.attr(
      'data-article-href',
      mode === 'next' ? this.nextArticleUrl : this.prevArticleUrl,
    );
    this.currentSlide.attr('data-article-title', title);
  }

  parseContent(responseText) {
    let content = responseText.match(
      /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
    )[0];

    content = content.replaceAll(
      /\<div class=\"topbar-area.+\<\/a\>\<\/span\>.\s+\<\/div\>|<aside class="sidebar.+<\/aside>|<footer class="footer">.+<\/footer>|<ul class="nav-.+<\/ul>|<div id="toast-box.+<\/div>|<div id="boardBtns">.+clearfix">.+<\/div>|<form action="\/b\/.+(<\/option>.\s+<\/select>).(\s+<\/div>){2}|<div class="included-article-list.+<\/small>.+<\/p>.\s+<\/div>/gs,
      '',
    );

    return $(content);
  }
}
