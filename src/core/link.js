import { fetchLoopNext, fetchUrl } from 'src/utils/request';

export class LinkManager {
  initLink() {
    if (this.mode === 'CHANNEL' && this.channelId) {
      this.initArticleLinkChannel();
      this.articleHistory = [];
      this.saveConfig();
    }
    if (this.mode === 'ARTICLE' && this.articleId) {
      if (!this.articleHistory.includes(window.location.href)) {
        this.articleHistory.push(window.location.href);
        if (this.articleHistory.length > 10) {
          this.articleHistory.shift();
        }
        this.saveConfig();
      }
      this.initArticleLinkActive();
    }
  }

  initArticleLinkChannel() {
    const totalLinks = $(
      'div.article-list > div.list-table.table > a.vrow.column',
    ).not('.notice');

    if (totalLinks.length === 0) {
      this.promiseList.push(fetchLoopNext.bind(this));
      return;
    }

    this.nextArticleUrl = this.filterLink(totalLinks)[0];
  }

  initArticleLinkActive() {
    const currentArticleIndex = this.articleHistory.findIndex((ele) =>
      ele.includes(this.articleId),
    );
    if (
      this.articleHistory.length > 0 &&
      currentArticleIndex > 0 &&
      currentArticleIndex < this.articleHistory.length - 1
    ) {
      this.nextArticleUrl = this.articleHistory[currentArticleIndex + 1];
      this.prevArticleUrl = this.articleHistory[currentArticleIndex - 1];
      return;
    }

    const $activeSlide = $('.swiper-slide-active');
    const $html = $activeSlide.length ? $activeSlide : $('.root-container');

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
      this.nextArticleUrl = nextArticleUrlList[0];
    } else {
      this.promiseList.push(fetchLoopNext.bind(this));
    }

    if (this.articleHistory.length > 1) {
      this.prevArticleUrl = this.articleHistory[currentArticleIndex - 1];
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
          !this.articleHistory.includes(
            href.match(this.channelAndArticleIdRegex)[0].split('/')[1],
          ),
      );
  }

  nextLink() {
    if (this.slideMode === 'REFRESH' || this.mode === 'CHANNEL') {
      if (this.nextArticleUrl) window.location.href = this.nextArticleUrl;
      this.promiseList.push(this.nextLink.bind(this));
    }
  }

  async nextLinkPageRender() {
    if (this.nextArticleUrl) {
      const res = await fetchUrl(this.nextArticleUrl);
      const content = res.responseText.match(
        /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
      )[0];
      const title = res.responseText
        .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
        .trim();

      const $article = $(content);

      // $('.slide-empty').empty();
      $('.slide-empty').append($article);

      document.title = title;
      window.history.pushState({}, title, this.nextArticleUrl);

      $('.slide-empty .custom-loader').remove();
      $('.slide-empty').removeClass('slide-empty');

      this.initForSlideRender();

      const slide = $('<div>', { class: 'swiper-slide slide-empty' });
      $('<div>', { class: 'custom-loader' }).appendTo(slide);

      this.swiper.appendSlide(slide.get());
    }
  }

  prevLink() {
    if (this.slideMode === 'REFRESH') {
      window.location.href = this.prevArticleUrl;
    }
  }
}
