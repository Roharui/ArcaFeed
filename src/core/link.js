// vault, fetch, regex

import { Vault } from './vault';

export class LinkManager extends Vault {
  initLink() {
    if (this.mode === 'CHANNEL') {
      this.articleList = [];
      this.parseSearchQuery();
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
      this.addPromiseCurrent(this.parseFromArticleList.bind(this, 'next'));
      return;
    }

    this.articleList = filteredLinks;
    this.nextArticleUrl = filteredLinks[0];
  }

  initArticleLinkActive() {
    const $html = this.currentSlide;

    if (this.articleList.length === 0) {
      this.addPromiseCurrent(
        this.fetchFromCurrentSlide.bind(this, 'all', $html),
      );
      return;
    }

    const currentArticleId =
      $html.attr('data-article-id')?.trim() || this.articleId;

    let currentArticleIndex = this.articleList.findIndex((ele) =>
      ele.includes(currentArticleId),
    );

    if (currentArticleIndex === -1) {
      this.addPromiseCurrent(
        this.fetchFromCurrentSlide.bind(this, 'all', $html),
      );
      return;
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
      this.nextArticleUrl = null;
      this.prevArticleUrl = this.articleList[currentArticleIndex - 1];

      this.addPromiseCurrent(this.fetchFromCurrentSlide.bind(this, 'next'));
    } else if (currentArticleIndex === 0) {
      this.prevArticleUrl = null;
      this.nextArticleUrl = this.articleList[currentArticleIndex + 1];

      this.addPromiseCurrent(this.fetchFromCurrentSlide.bind(this, 'prev'));
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
      .filter(
        (href) =>
          articleListString.indexOf(this.getArticleIdFromHref(href)) === -1,
      );
  }

  parseSearchQuery() {
    const searchParams = new URLSearchParams(this.search);

    searchParams.delete('p');
    searchParams.delete('near');
    searchParams.delete('after');
    searchParams.delete('before');
    searchParams.delete('tz');

    this.searchQuery = searchParams.toString();
    this.searchQuery = this.searchQuery ? `?${this.searchQuery}` : '';
  }
}
