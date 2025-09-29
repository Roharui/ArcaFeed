import { fetchLoopNext, fetchUrl } from 'src/utils/request';

export class LinkManager {
  async initLink() {
    if (this.mode === 'CHANNEL') {
      this.initArticleLinkChannel();
      this.clearHistory();
    }
    if (this.mode === 'ARTICLE') {
      this.articleTitleList.push(document.title);
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
    this.currentArticleIndex = this.articleList.findIndex((ele) =>
      ele.includes(this.articleId),
    );

    if (this.articleList.length > 0 && this.currentArticleIndex >= 0) {
      if (this.currentArticleIndex === this.articleList.length - 1) {
        this.prevArticleUrl = this.articleList[this.currentArticleIndex - 1];
      } else if (this.currentArticleIndex === 0) {
        this.nextArticleUrl = this.articleList[this.currentArticleIndex + 1];
        return;
      } else {
        this.nextArticleUrl = this.articleList[this.currentArticleIndex + 1];
        this.prevArticleUrl = this.articleList[this.currentArticleIndex - 1];
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

    const filteredLinks = this.filterLink(totalLinks);

    const index = filteredLinks.findIndex((ele) =>
      ele.includes(this.articleId),
    );

    const nextArticleUrlList = filteredLinks.slice(index + 1);

    if (nextArticleUrlList.length > 0 && index >= 0) {
      this.articleList.push(...nextArticleUrlList);
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
          this.articleList
            .join(',')
            .indexOf(
              href.match(this.channelAndArticleIdRegex)[0].split('/')[1],
            ) === -1,
      );
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
    }
    this.promiseList.push(this.setCurrentArticle);
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
    this.currentArticleIndex = this.swiper.activeIndex;

    this.currentArticleTitle = this.articleTitleList[this.currentArticleIndex];
    this.currentArticleUrl = this.articleList[this.currentArticleIndex];

    console.log(this.currentArticleIndex);
    console.log(this.currentArticleTitle);
    console.log(this.currentArticleUrl);
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

    this.articleTitleList.push(title);

    $('.slide-empty .custom-loader').remove();
    $('.slide-empty').removeClass('slide-empty').addClass('main-slide');
  }
}
