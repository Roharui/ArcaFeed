import {
  fetchLoopNext,
  fetchLoopPrev,
  fetchWithPromise,
} from 'src/utils/request';

export class LinkManager {
  initLink() {
    if (this.mode === 'CHANNEL' && this.channelId) {
      this.initArticleLinkChannel();
    }
    if (this.mode === 'ARTICLE' && this.articleId) {
      this.initArticleLinkActive();
    }
  }

  initArticleLinkChannel() {
    const totalLinks = $(
      'div.article-list > div.list-table.table > a.vrow.column',
    ).not('.notice');

    this.nextArticleUrl = this.filterLink(totalLinks)[0];
  }

  initArticleLinkActive() {
    const totalLinks = $(
      'div.included-article-list > div.article-list > div.list-table.table > a.vrow.column',
    ).not('.notice');
    const filteredLinks = this.filterLink(totalLinks);

    const index = filteredLinks.findIndex((ele) =>
      ele.includes(this.articleId),
    );

    const nextArticleUrlList = filteredLinks.slice(index + 1);
    const prevArticleUrlList = filteredLinks.slice(0, index);

    if (nextArticleUrlList.length > 0 && index >= 0) {
      this.nextArticleUrl = nextArticleUrlList[0];
    } else {
      this.promiseList.push([fetchLoopNext, this]);
    }

    if (prevArticleUrlList.length > 0) {
      this.prevArticleUrl = prevArticleUrlList[0];
    } else {
      this.promiseList.push([fetchLoopPrev, this]);
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
      .map((ele) => $(ele).attr('href'));
  }

  nextLink() {
    if (this.nextArticleUrl) window.location.href = this.nextArticleUrl;
  }

  prevLink() {
    if (this.prevArticleUrl) window.location.href = this.prevArticleUrl;
  }
}
