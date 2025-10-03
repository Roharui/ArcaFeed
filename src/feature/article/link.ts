
import $ from 'jquery';

import type { PromiseFunc } from '@/types';
import type { Vault, Config } from '@/vault';

import { FetchManager } from './fetch';

class LinkManager extends FetchManager {
  constructor(v: Vault, c: Config) {
    super(v, c);
  }

  init(): PromiseFunc {
    return this.initLink.bind(this);
  }

  initLink(v?: Vault): Vault {
    this.v = v || this.v;

    if (this.v.isCurrentMode('CHANNEL')) {
      this.c.articleList = [];
      this.parseSearchQuery();
      this.initArticleLinkChannel();
    }
    if (this.v.isCurrentMode('ARTICLE')) {
      this.initArticleLinkActive();
    }

    return this.v;
  }

  initArticleLinkChannel() {
    const totalLinks = $(
      'div.article-list > div.list-table.table > a.vrow.column',
    ).not('.notice');

    const filteredLinks = this.filterLink(totalLinks);


    if (filteredLinks.length === 0) {
      return;
    }

    this.c.articleList = filteredLinks;
    this.v.nextArticleUrl = filteredLinks[0] || '';
  }

  initArticleLinkActive() {
    let { href } = this.v;
    const { articleList } = this.c;

    const $html = this.v.currentSlide || $('.root-container');

    if (this.c.articleList.length === 0) {
      return;
    }

    const currentArticleId =
      $html.attr('data-article-id')?.trim() || href.articleId;

    let currentArticleIndex = this.c.articleList.findIndex((ele: string) =>
      ele.includes(currentArticleId),
    );

    if (currentArticleIndex === -1) {
      return;
    }

    if (
      this.c.articleList.length > 0 &&
      currentArticleIndex >= 0 &&
      currentArticleIndex !== this.c.articleList.length - 1 &&
      currentArticleIndex !== 0
    ) {
      this.v.nextArticleUrl =
        this.c.articleList[currentArticleIndex + 1] || null;
      this.v.prevArticleUrl =
        this.c.articleList[currentArticleIndex - 1] || null;

      return { ...this.v, href } as Vault;
    }

    if (currentArticleIndex === this.c.articleList.length - 1) {
      this.v.nextArticleUrl = null;
      this.v.prevArticleUrl = articleList[currentArticleIndex - 1] || null;

      // this.addPromiseCurrent(this.fetchFromCurrentSlide.bind(this, 'next'));
    } else if (currentArticleIndex === 0) {
      this.v.prevArticleUrl = null;
      this.v.nextArticleUrl = articleList[currentArticleIndex + 1] || null;

      // this.addPromiseCurrent(this.fetchFromCurrentSlide.bind(this, 'prev'));
    }

    href = { ...href, articleId: currentArticleId };
    return { ...this.v, href } as Vault;
  }

}

export { LinkManager };
