import { fetchLoopNext, fetchUrl } from 'src/utils/request';

export class LinkManager {
  initLink() {
    if (this.mode === 'CHANNEL' && this.channelId) {
      this.initArticleLinkChannel();
      this.articleHistory = [];
      this.articleTitleHistory = [];
      this.saveConfig();
    }
    if (this.mode === 'ARTICLE' && this.articleId) {
      if (!this.articleHistory.includes(window.location.href)) {
        this.articleHistory.push(window.location.href);
        this.articleTitleHistory.push(document.title);
        if (this.articleHistory.length > 10) {
          this.articleHistory.shift();
          this.articleTitleHistory.shift();
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

    const filteredLinks = this.filterLink(totalLinks);

    if (filteredLinks.length === 0) {
      this.promiseList.push(fetchLoopNext.bind(this));
      return;
    }

    this.nextArticleUrl = filteredLinks[0];
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
    const $html = $activeSlide.length
      ? $activeSlide
      : $('.swiper-slide').last();

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
      this.nextArticleUrl = null;
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
      .map((href) => {
        const m = href.match(this.channelAndArticleIdRegex);

        console.log(
          'FILTER',
          href,
          m,
          this.articleHistory.join(',').indexOf(m[0].split('/')[1]),
        );

        return href;
      })
      .filter(
        (href) =>
          this.articleHistory
            .join(',')
            .indexOf(
              href.match(this.channelAndArticleIdRegex)[0].split('/')[1],
            ) === -1,
      );
  }

  nextLink() {
    if (this.slideMode === 'REFRESH' || this.mode === 'CHANNEL') {
      if (this.nextArticleUrl) window.location.href = this.nextArticleUrl;
      this.promiseList.push(this.nextLink.bind(this));
    }
  }

  async nextLinkPageRender() {
    if ($('.swiper-slide-active').attr('class').includes('slide-empty')) {
      if (this.nextArticleUrl) {
        const res = await fetchUrl(this.nextArticleUrl);
        const content = res.responseText.match(
          /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/s,
        )[0];
        const title = res.responseText
          .match(/(?<=title\>).+-.+(?=\<\/title)/s)[0]
          .trim();

        const $article = $(content);

        $('.slide-empty').append($article);

        document.title = title;
        window.history.pushState({}, title, this.nextArticleUrl);

        $('.slide-empty .custom-loader').remove();
        $('.slide-empty').removeClass('slide-empty');

        this.initForSlideRender();

        const slide = $('<div>', { class: 'swiper-slide slide-empty' });
        $('<div>', { class: 'custom-loader' }).appendTo(slide);

        this.swiper.appendSlide(slide.get());
      } else {
        this.promiseList.push(this.nextLinkPageRender.bind(this));
      }
    } else {
      const index = $('.swiper-slide').index($('.swiper-slide-active'));

      if (index < this.articleTitleHistory.length) {
        document.title = this.articleTitleHistory[index];
        window.history.pushState(
          {},
          this.articleTitleHistory[index],
          this.articleHistory[index],
        );
      }
    }
  }

  async prevLinkPageRender() {
    const index = $('.swiper-slide').index($('.swiper-slide-active'));
    if (index >= 0) {
      document.title = this.articleTitleHistory[index];
      window.history.pushState(
        {},
        this.articleTitleHistory[index],
        this.articleHistory[index],
      );
    }
  }

  prevLink() {
    if (this.slideMode === 'REFRESH') {
      window.location.href = this.prevArticleUrl;
    }
  }
}
