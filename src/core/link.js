import { sleep } from 'src/utils/sleep';

export class LinkManager {
  initLink() {
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
      this.addPromiseCurrent(this.fetchLoopNext);
      return;
    }

    this.articleList = filteredLinks;
    this.nextArticleUrl = filteredLinks[0];
  }

  initArticleLinkActive() {
    let $html = null;

    $html = this.swiper ? $(this.swiper?.slides[this.swiper?.activeIndex]) : [];

    if ($html.length === 0) {
      this.addPromiseCurrent(sleep(100), this.initArticleLinkActive(slide));
      return;
    }

    const currentArticleId = $html.attr('data-article-id')?.trim();

    this.currentArticleIndex = this.articleList.findIndex((ele) =>
      ele.includes(currentArticleId),
    );

    console.log('Current Article Index:', this.currentArticleIndex);

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
        this.addPromiseCurrent(this.fetchLoopNext);
      }
    }

    if (this.prevArticleUrl === null) {
      if (prevArticleUrlList.length > 0) {
        this.articleList.unshift(...prevArticleUrlList);
        this.prevArticleUrl = prevArticleUrlList[prevArticleUrlList.length - 1];
      } else {
        this.addPromiseCurrent(this.fetchLoopPrev);
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
      .map((href) => {
        return `https://arca.live${href.replace('https://arca.live', '')}`;
      })
      .map((href) =>
        href.replace(
          /\?p=\d+$/,
          `?before=${new Date().toISOString()}&tz=%2B0900`,
        ),
      )
      .filter(
        (href) =>
          articleListString.indexOf(this.getArticleIdFromHref(href)) === -1,
      );
  }
}
