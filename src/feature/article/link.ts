// vault, fetch, regex

import $ from 'jquery';

import type { PromiseFunc } from '@/types/func';
import type { Vault } from '@/vault';
import { ArticleBase } from './base';

class LinkManager extends ArticleBase {
  init(): PromiseFunc {
    return this.initLink.bind(this);
  }

  initLink(vault: Vault): Vault {
    if (vault.isCurrentMode('CHANNEL')) {
      vault.config.articleList = [];
      this.parseSearchQuery();
      this.initArticleLinkChannel(vault);
    }
    if (vault.isCurrentMode('ARTICLE')) {
      this.initArticleLinkActive();
    }

    return vault;
  }

  initArticleLinkChannel(vault: Vault): Vault {
    const totalLinks = $(
      'div.article-list > div.list-table.table > a.vrow.column',
    ).not('.notice');

    const filteredLinks = this.filterLink(totalLinks);

    /*
    if (filteredLinks.length === 0) {
      this.addPromiseCurrent(this.parseFromArticleList.bind(this, 'next'));
      return;
    }
    */

    vault.config.articleList = filteredLinks;
    vault.nextArticleUrl = filteredLinks[0];

    return vault;
  }

  initArticleLinkActive(vault: Vault): Vault {
    let { href, config } = vault;
    const { articleList } = config;

    const $html = vault.currentSlide || $('.root-container');

    /*
    if (vault.config.articleList.length === 0) {
      this.addPromiseCurrent(
        this.fetchFromCurrentSlide.bind(this, 'all', $html),
      );
      return;
    }
    */

    const currentArticleId =
      $html.attr('data-article-id')?.trim() || href.articleId;

    let currentArticleIndex = config.articleList.findIndex((ele) =>
      ele.includes(currentArticleId),
    );

    /*
    if (currentArticleIndex === -1) {
      this.addPromiseCurrent(
        this.fetchFromCurrentSlide.bind(this, 'all', $html),
      );
      return;
    }
    */

    if (
      config.articleList.length > 0 &&
      currentArticleIndex >= 0 &&
      currentArticleIndex !== config.articleList.length - 1 &&
      currentArticleIndex !== 0
    ) {
      vault.nextArticleUrl =
        config.articleList[currentArticleIndex + 1] || null;
      vault.prevArticleUrl =
        config.articleList[currentArticleIndex - 1] || null;

      return { ...vault, href, config } as Vault;
    }

    if (currentArticleIndex === config.articleList.length - 1) {
      vault.nextArticleUrl = null;
      vault.prevArticleUrl = articleList[currentArticleIndex - 1] || null;

      // this.addPromiseCurrent(this.fetchFromCurrentSlide.bind(this, 'next'));
    } else if (currentArticleIndex === 0) {
      vault.prevArticleUrl = null;
      vault.nextArticleUrl = articleList[currentArticleIndex + 1] || null;

      // this.addPromiseCurrent(this.fetchFromCurrentSlide.bind(this, 'prev'));
    }

    href = { ...href, articleId: currentArticleId };
    return { ...vault, href, config } as Vault;
  }

  filterLink(vault: Vault, rows: JQuery<HTMLElement>): string[] {
    const { articleList, articleFilterConfig } = vault.config;

    const articleFilter = articleFilterConfig[vault.href.channelId];
    const articleListString = articleList.join(',');

    let resultRows = rows.toArray();

    if (articleFilter) {
      resultRows = resultRows.filter((ele) => {
        const _tabTypeText = $(ele).find('.badge-success').text();
        const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

        const titleText = $(ele).find('.title').text().trim();

        const tabAllow = articleFilter.tab.includes(tabTypeText);
        const titleAllow = articleFilter.title.every(
          (keyword) => !titleText.includes(keyword),
        );

        const result = tabAllow && titleAllow;

        if (!result) $(ele).css('opacity', '0.5');
        else $(ele).css('opacity', '1');

        return result;
      });
    }

    return resultRows
      .map((ele) => $(ele).attr('href') || '')
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

export { LinkManager };
