import { sleep } from 'src/utils/sleep';

export class PageManager {
  nextLinkForce() {
    window.location.href = this.nextArticleUrl;
  }

  nextLink() {
    if (this.slideMode === 'REFRESH')
      window.location.href = this.nextArticleUrl;
    else this.nextPageRender();
  }

  prevLink() {
    if (this.slideMode === 'REFRESH')
      window.location.href = this.prevArticleUrl;
    else this.prevPageRender();
  }

  alertNextPageIsFetching($slide) {
    $slide
      .find('.loading-info')
      .append($('<div>').text('다음 글 불러오는 중...'));
  }

  alertPrevPageIsFetching($slide) {
    $slide
      .find('.loading-info')
      .append($('<div>').text('이전 글 불러오는 중...'));
  }

  nextPageRender() {
    if (this.isActive) return;
    if (this.nextArticleUrl == null) return;

    const $slide = $(this.swiper.slides[this.swiper.realIndex]);

    const promiseList = [];
    if (this.swiper.realIndex === this.swiper.slides.length - 1) {
      promiseList.push(() => this.alertNextPageIsFetching($slide));
      promiseList.push(() => this.nextLinkPageRender($slide));
      promiseList.push(() => this.appendNewEmptySlide());
      promiseList.push(() => this.doHide('Article'));
    }
    promiseList.push(() => this.setCurrentArticle($slide));
    promiseList.push(() => this.initArticleLinkActive($slide));

    this.addNextPromise(promiseList);
  }

  prevPageRender() {
    if (this.isActive) return;
    if (this.prevArticleUrl == null) return;

    const $slide = $(this.swiper.slides[this.swiper.realIndex]);

    const promiseList = [];
    if (this.swiper.realIndex === 0) {
      promiseList.push(() => this.alertPrevPageIsFetching($slide));
      promiseList.push(() => this.prevLinkPageRender($slide));
      promiseList.push(() => this.appendNewEmptySlide());
      promiseList.push(() => this.doHide('Article'));
    }
    promiseList.push(() => this.setCurrentArticle($slide));
    promiseList.push(() => this.initArticleLinkActive($slide));

    this.addNextPromise(promiseList);
  }

  setCurrentArticle($slide) {
    this.currentArticleUrl = $slide.attr('data-article-href');
    this.currentArticleTitle = $slide.attr('data-article-title');

    document.title = this.currentArticleTitle;
    window.history.pushState(
      {},
      this.currentArticleTitle,
      this.currentArticleUrl,
    );
  }

  // 로직 정리
  // 1. 다음 슬라이드가 빈 슬라이드면 다음 글 불러오기
  // 2. 다음 글을 불러온 후 빈 슬라이드에 추가 (display: none)
  // 3. 블러온 글에 대한 hider 처리 진행
  // 4. 슬라이드 갱신
  async nextLinkPageRender($slide) {
    let res;

    while (!res) {
      res = await this.fetchUrl(this.nextArticleUrl);

      if (!res) {
        $slide
          .find('.loading-info')
          .append($('<div>').text('글 불러오기 실패'));

        await sleep(5000);
        continue;
      }
    }

    const content = res.responseText.match(
      /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
    )[0];
    const title = res.responseText
      .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
      .trim();

    const $article = $(content);

    const currentArticleId = this.getArticleIdFromHref(this.nextArticleUrl);

    $slide.append($article);
    $slide.attr('data-article-id', currentArticleId);
    $slide.attr('data-article-href', this.nextArticleUrl);
    $slide.attr('data-article-title', title);

    $slide.find('.loader-container').remove();
    $slide.removeClass('slide-empty').removeClass('next');
  }

  // 로직 정리
  // 1. 다음 슬라이드가 빈 슬라이드면 다음 글 불러오기
  // 2. 다음 글을 불러온 후 빈 슬라이드에 추가 (display: none)
  // 3. 블러온 글에 대한 hider 처리 진행
  // 4. 슬라이드 갱신
  async prevLinkPageRender() {
    let res;

    if (!this.prevLinkArticleUrl) {
      alert('이전 글이 없습니다.');
      return;
    }

    while (!res) {
      res = await this.fetchUrl(this.prevLinkArticleUrl);

      if (!res) {
        $slide
          .find('.loading-info')
          .append($('<div>').text('글 불러오기 실패'));

        await sleep(5000);
        continue;
      }
    }

    const content = res.responseText.match(
      /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
    )[0];
    const title = res.responseText
      .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
      .trim();

    const $article = $(content);

    const currentArticleId = this.getArticleIdFromHref(this.prevLinkArticleUrl);

    $slide.append($article);
    $slide.attr('data-article-id', currentArticleId);
    $slide.attr('data-article-href', this.prevLinkArticleUrl);
    $slide.attr('data-article-title', title);

    $slide.find('.loader-container').remove();
    $slide.removeClass('slide-empty').removeClass('prev');
  }
}
