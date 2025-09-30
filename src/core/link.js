import { Vault } from './vault';

export class LinkManager extends Vault {
  initLink() {
    if (this.mode === 'CHANNEL') {
      this.clearArticle();
      this.initArticleLinkChannel();
    }
    if (this.mode === 'ARTICLE') {
      this.currentSlide = $(this.swiper?.slides[this.swiper?.activeIndex]);
      this.initArticleLinkActive();
    }
  }

  initArticleLinkChannel() {
    const totalLinks = $(
      'div.article-list > div.list-table.table > a.vrow.column',
    ).not('.notice');

    const filteredLinks = this.filterLink(totalLinks);

    if (filteredLinks.length === 0) {
      this.addPromiseCurrent(this.fetchLoop.bind(this, 'next'));
      return;
    }

    this.articleList = filteredLinks;
    this.nextArticleUrl = filteredLinks[0];
  }

  initArticleLinkActive() {
    const $html = this.currentSlide;

    const currentArticleId = $html.attr('data-article-id')?.trim();

    if (!currentArticleId) {
      return;
    }

    let currentArticleIndex = this.articleList.findIndex((ele) =>
      ele.includes(currentArticleId),
    );

    if (currentArticleIndex === -1) {
      this.articleList.push(`/b/${this.channelId}/${this.articleId}`);
      currentArticleIndex = this.articleList.length - 1;
    }

    if (
      this.articleList.length > 0 &&
      currentArticleIndex >= 0 &&
      currentArticleIndex !== this.articleList.length - 1 &&
      currentArticleIndex !== 0
    ) {
      this.nextArticleUrl = this.articleList[currentArticleIndex + 1];
      this.prevArticleUrl = this.articleList[currentArticleIndex - 1];
      return;
    }

    if (currentArticleIndex === this.articleList.length - 1) {
      this.prevArticleUrl = this.articleList[currentArticleIndex - 1];
      this.nextArticleUrl = null;
    } else if (currentArticleIndex === 0) {
      this.prevArticleUrl = null;
      this.nextArticleUrl = this.articleList[currentArticleIndex + 1];
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
        this.addPromiseCurrent(this.fetchLoop.bind(this, 'next'));
      }
    }

    if (this.prevArticleUrl === null) {
      if (prevArticleUrlList.length > 0) {
        this.articleList.unshift(...prevArticleUrlList);
        this.prevArticleUrl = prevArticleUrlList[prevArticleUrlList.length - 1];
      } else {
        this.addPromiseCurrent(this.fetchLoop.bind(this, 'prev'));
      }
    }
  }

  filterLink(rows) {
    const channelId = this.channelId;

    const articleFilterConfig = this.articleFilterConfig[channelId] || null;
    const articleListString = this.articleList.join(',');

    let resultRows = rows.toArray();

    if (articleFilterConfig) {
      resultRows = resultRows.filter((ele) => {
        const _tabTypeText = $(ele).find('.badge-success').text();
        const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

        const titleText = $(ele).find('.title').text().trim();

        const tabAllow = articleFilterConfig.tab.includes(tabTypeText);
        const titleAllow = articleFilterConfig.title.every(
          (keyword) => !titleText.includes(keyword),
        );

        const result = tabAllow && titleAllow;

        if (!result) $(ele).css('opacity', '0.5');
        else $(ele).css('opacity', '1');

        return result;
      });
    }

    return resultRows
      .map((ele) => $(ele).attr('href').trim())
      .map((href) => href.replace('https://arca.live', ''))
      .map((href) => href.replace(/\?.+$/, ''))
      .filter((href) => !!href)
      .filter(
        (href) =>
          articleListString.indexOf(this.getArticleIdFromHref(href)) === -1,
      );
  }
}
