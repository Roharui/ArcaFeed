import { fetchLoopNext, fetchUrl } from 'src/utils/request';

export class LinkManager {
  async initLink() {
    if (this.mode === 'CHANNEL') {
      this.initArticleLinkChannel();
      this.clearHistory();
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

    this.nextArticleUrl = filteredLinks[0];
  }

  initArticleLinkActive() {
    this.currentArticleTitle = this.currentArticleTitle || document.title;
    this.currentArticleUrl = this.currentArticleUrl || window.location.href;

    if (!this.articleHistory.includes(this.currentArticleUrl)) {
      this.articleHistory.push(this.currentArticleUrl);
      this.articleTitleHistory.push(this.currentArticleTitle);
      if (this.articleHistory.length > 10) {
        this.articleHistory.shift();
        this.articleTitleHistory.shift();
      }
    }

    this.initPageMode(this.currentArticleUrl);

    const currentArticleIndex = this.articleHistory.findIndex((ele) =>
      ele.includes(this.articleId),
    );

    if (this.articleHistory.length > 0 && currentArticleIndex >= 0) {
      if (currentArticleIndex === this.articleHistory.length - 1) {
        this.prevArticleUrl = this.articleHistory[currentArticleIndex - 1];
      } else if (currentArticleIndex === 0) {
        this.nextArticleUrl = this.articleHistory[currentArticleIndex + 1];
        return;
      } else {
        this.nextArticleUrl = this.articleHistory[currentArticleIndex + 1];
        this.prevArticleUrl = this.articleHistory[currentArticleIndex - 1];
        return;
      }
    }

    const $check = $('.swiper');

    let $html = $('.swiper-slide-active');

    if ($check.length === 0) {
      $html = $('.root-container');
    } else if ($html.length === 0) {
      this.promiseList.unshift(this.initArticleLinkActive);
      this.promiseList.unshift(sleep(100));
      return;
    }

    const totalLinks = $html
      .find(
        'div.included-article-list > div.article-list > div.list-table.table > a.vrow.column',
      )
      .not('.notice');

    console.log(this.articleHistory);
    const filteredLinks = this.filterLink(totalLinks);
    console.log(filteredLinks);

    const index = filteredLinks.findIndex((ele) =>
      ele.includes(this.articleId),
    );

    const nextArticleUrlList = filteredLinks.slice(index + 1);

    if (nextArticleUrlList.length > 0 && index >= 0) {
      this.nextArticleUrl = nextArticleUrlList[0];
    } else {
      this.promiseList.unshift(fetchLoopNext);
    }
  }

  filterLink(rows) {
    const channelId = this.channelId;

    const articleFilterConfig = this.articleFilterConfig[channelId] || null;

    if (!articleFilterConfig)
      return rows.toArray().map((ele) => $(ele).attr('href'));

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
      .filter(
        (href) =>
          this.articleHistory
            .join(',')
            .indexOf(
              href.match(this.channelAndArticleIdRegex)[0].split('/')[1],
            ) === -1,
      );
  }

  historyPush(href, title = null) {
    if (!this.articleHistory.includes(href)) {
    }
  }

  nextLink() {
    window.location.href = this.nextArticleUrl;
  }

  prevLink() {
    window.location.href = this.prevArticleUrl;
  }

  nextPageRender() {
    if (this.swiper.slides.length - 1 === this.swiper.activeIndex) {
      this.promiseList.push(this.nextLinkPageRender);
      this.promiseList.push(this.addNewEmptySlide);
      this.promiseList.push(() => this.doHide('Article'));
    } else {
      this.promiseList.push(this.setCurrentArticle);
    }
    this.promiseList.push(this.initArticleLinkActive);
    this.promiseList.push(this.changeUrlAndTitle);

    setTimeout(() => this.initPromise(), 100);
  }

  prevPageRender() {
    this.promiseList.push(this.setCurrentArticle);
    this.promiseList.push(this.initArticleLinkActive);
    this.promiseList.push(this.changeUrlAndTitle);

    setTimeout(() => this.initPromise(), 100);
  }

  setCurrentArticle() {
    const sliderIndex = this.swiper.activeIndex;

    this.currentArticleTitle = this.articleTitleHistory[sliderIndex];
    this.currentArticleUrl = this.articleHistory[sliderIndex];
  }

  changeUrlAndTitle() {
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
  async nextLinkPageRender() {
    const res = await fetchUrl(this.nextArticleUrl);

    const content = res.responseText.match(
      /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
    )[0];
    const title = res.responseText
      .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
      .trim();

    const $article = $(content);

    $('.main-slide').removeClass('main-slide');
    $('.slide-empty').append($article);

    this.articleHistory.push(this.nextArticleUrl);
    this.articleTitleHistory.push(title);

    if (this.articleHistory.length > 10) {
      this.articleHistory.shift();
      this.articleTitleHistory.shift();
    }

    this.currentArticleTitle = title;
    this.currentArticleUrl = `https://arca.live${this.nextArticleUrl.replace('https://arca.live', '')}`;

    $('.slide-empty .custom-loader').remove();
    $('.slide-empty').removeClass('slide-empty').addClass('main-slide');
  }
}
