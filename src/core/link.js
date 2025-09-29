import { fetchLoopNext, fetchLoopPrev, fetchUrl } from 'src/utils/request';
import { sleep } from 'src/utils/sleep';

export class LinkManager {
  async initLink() {
    if (this.mode === 'CHANNEL') {
      this.clearArticle();
      this.initArticleLinkChannel();
    }
    if (this.mode === 'ARTICLE') {
      this.initArticleLinkActive();
    }
  }

  initArticleLinkChannel() {
    const totalLinks = $(
      'div.article-list > div.list-table.table > a.vrow.column',
    ).not('.notice');

    const filteredLinks = this.filterLink(totalLinks);

    if (filteredLinks.length === 0) {
      this.promiseList.unshift(fetchLoopNext);
      return;
    }

    this.articleList = filteredLinks;
    this.nextArticleUrl = filteredLinks[0];
  }

  initArticleLinkActive() {
    let $html = null;

    $html = this.swiper ? $(this.swiper?.slides[this.swiper?.activeIndex]) : [];

    if ($html.length === 0) {
      this.promiseList.unshift(this.initArticleLinkActive(slide));
      this.promiseList.unshift(sleep(100));
      return;
    }

    const currentArticleId = $html.attr('data-article-id')?.trim();

    this.currentArticleIndex = this.articleList.findIndex((ele) =>
      ele.includes(currentArticleId),
    );

    console.log('Current Article Index:', this.currentArticleIndex);
    console.log('Article List:', this.articleList);

    if (this.currentArticleIndex === -1) {
      this.articleList.push(
        `https://arca.live/b/${this.channelId}/${currentArticleId}`,
      );
      this.currentArticleIndex = this.articleList.length - 1;
    }

    if (
      this.articleList.length > 0 &&
      this.currentArticleIndex >= 0 &&
      this.currentArticleIndex !== this.articleList.length - 1 &&
      this.currentArticleIndex !== 0
    ) {
      this.nextArticleUrl = this.articleList[this.currentArticleIndex + 1];
      this.prevArticleUrl = this.articleList[this.currentArticleIndex - 1];
      return;
    }

    if (this.currentArticleIndex === this.articleList.length - 1) {
      this.prevArticleUrl = this.articleList[this.currentArticleIndex - 1];
      this.nextArticleUrl = null;
    } else if (this.currentArticleIndex === 0) {
      this.prevArticleUrl = null;
      this.nextArticleUrl = this.articleList[this.currentArticleIndex + 1];
    }

    const totalLinks = $html
      .find(
        'div.included-article-list > div.article-list > div.list-table.table > a.vrow.column',
      )
      .not('.notice');

    const filteredLinks = this.filterLink(totalLinks);

    const index = filteredLinks.findIndex((ele) =>
      ele.includes(currentArticleId),
    );

    const nextArticleUrlList =
      index !== -1 ? filteredLinks.slice(index + 1) : [];
    const prevArticleUrlList =
      index !== -1 ? filteredLinks.slice(0, index - 1) : [];

    if (this.nextArticleUrl === null) {
      if (nextArticleUrlList.length > 0) {
        this.articleList.push(...nextArticleUrlList);
        this.nextArticleUrl = nextArticleUrlList[0];
      } else {
        this.promiseList.unshift(fetchLoopNext);
      }
    }

    if (this.prevArticleUrl === null) {
      if (prevArticleUrlList.length > 0) {
        this.articleList.unshift(...prevArticleUrlList);
        this.prevArticleUrl = prevArticleUrlList[prevArticleUrlList.length - 1];
      } else {
        this.promiseList.unshift(fetchLoopPrev);
      }
    }
  }

  filterLink(rows) {
    const channelId = this.channelId;

    const articleFilterConfig = this.articleFilterConfig[channelId] || null;
    const articleListString = this.articleList.join(',');

    if (!articleFilterConfig)
      return rows
        .toArray()
        .map((ele) => $(ele).attr('href').trim())
        .map((href) => {
          return `https://arca.live${href.replace('https://arca.live', '')}`;
        })
        .filter(
          (href) =>
            articleListString.indexOf(this.getArticleIdFromHref(href)) === -1,
        );

    return rows
      .toArray()
      .filter((ele) => {
        const _tabTypeText = $(ele).find('.badge-success').text();
        const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

        const titleText = $(ele).find('.title').text().trim();

        const tabAllow = articleFilterConfig.tab.includes(tabTypeText);
        const titleAllow = articleFilterConfig.title.every(
          (keyword) => !titleText.includes(keyword),
        );

        const result = tabAllow && titleAllow;

        if (!result) $(ele).css('opacity', '0.5');

        return result;
      })
      .map((ele) => $(ele).attr('href').trim())
      .map((href) => {
        return `https://arca.live${href.replace('https://arca.live', '')}`;
      })
      .filter(
        (href) =>
          articleListString.indexOf(this.getArticleIdFromHref(href)) === -1,
      );
  }

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

  nextPageRender() {
    if (this.nextArticleUrl === undefined) return;

    if (
      this.swiper.slides.length - 1 === this.swiper.realIndex &&
      !this.isActive
    ) {
      this.promiseList.push(this.nextLinkPageRender);
      this.promiseList.push(this.appendNewEmptySlide);
      this.promiseList.push(() => this.doHide('Article'));
    }
    this.promiseList.push(this.setCurrentArticle);
    this.promiseList.push(this.initArticleLinkActive);

    setTimeout(() => this.initPromise(), 100);
  }

  prevPageRender() {
    if (this.prevArticleUrl === undefined) return;

    if (this.swiper.realIndex === 0 && !this.isActive) {
      this.promiseList.push(this.prevLinkPageRender);
      this.promiseList.push(this.prependNewEmptySlide);
      this.promiseList.push(() => this.doHide('Article'));
    }
    this.promiseList.push(this.setCurrentArticle);
    this.promiseList.push(this.initArticleLinkActive);

    setTimeout(() => this.initPromise(), 100);
  }

  setCurrentArticle() {
    const $slide = $(this.swiper.slides[this.swiper.realIndex]);

    const currentArticleUrl = $slide.attr('data-article-href');
    const currentArticleTitle = $slide.attr('data-article-title');

    document.title = currentArticleTitle;
    window.history.pushState({}, currentArticleTitle, currentArticleUrl);
  }

  // 로직 정리
  // 1. 다음 슬라이드가 빈 슬라이드면 다음 글 불러오기
  // 2. 다음 글을 불러온 후 빈 슬라이드에 추가 (display: none)
  // 3. 블러온 글에 대한 hider 처리 진행
  // 4. 슬라이드 갱신
  async nextLinkPageRender() {
    const $slide = $(this.swiper.slides[this.swiper.realIndex]);

    $slide
      .find('.loading-info')
      .append($('<div>').text('다음 글 불러오는 중...'));

    const currentArticleId = this.getArticleIdFromHref(this.nextArticleUrl);

    const res = await fetchUrl(this.nextArticleUrl);

    const content = res.responseText.match(
      /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
    )[0];
    const title = res.responseText
      .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
      .trim();

    const $article = $(content);

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
    const $slide = $(this.swiper.slides[this.swiper.realIndex]);

    $slide
      .find('.loading-info')
      .append($('<div>').text('이전 글 불러오는 중...'));

    const currentArticleId = this.getArticleIdFromHref(this.prevArticleUrl);

    const res = await fetchUrl(this.prevArticleUrl);

    const content = res.responseText.match(
      /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
    )[0];
    const title = res.responseText
      .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
      .trim();

    const $article = $(content);

    $slide.append($article);
    $slide.attr('data-article-id', currentArticleId);
    $slide.attr('data-article-href', this.prevArticleUrl);
    $slide.attr('data-article-title', title);

    $slide.find('.loader-container').remove();
    $slide.removeClass('slide-empty').removeClass('prev');
  }
}
