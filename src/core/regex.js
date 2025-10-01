// vault

import { Vault } from './vault';

export class RegexManager extends Vault {
  homePageRegex = /arca\.live\/?$/;
  channelPageRegex = /b\/(.+)/;
  articlePageRegex = /b\/([A-Za-z0-9])+\/[0-9]+/;

  channelAndArticleIdRegex =
    /(?<=\/b\/).([A-Za-z0-9]).+(?=\/)|(?<=\/b\/([A-Za-z0-9])+\/).[0-9]+|\?.+/g;
  channelIdRegex = /(?<=\/b\/).([A-Za-z0-9])+|\?.+/g;
  articleIdRegex = /(?<=\/b\/([A-Za-z0-9])+\/).[0-9]+/;

  initPageMode(href) {
    const [mode, channelId, articleId, search] = this.checkPageMode(
      href || window.location.href,
    );

    this.mode = mode;
    this.channelId = channelId;
    this.articleId = articleId;
    this.search = search;
  }

  getArticleIdFromHref(href) {
    const articleMatch = href.match(this.articleIdRegex);

    if (!articleMatch.length) return null;

    const articleId = articleMatch[0];

    return articleId;
  }

  checkPageMode(href) {
    console.log('Checking page mode for href:', href);

    if (this.articlePageRegex.test(href)) {
      const [channelId, articleId, search] = href
        .matchAll(this.channelAndArticleIdRegex)
        .map((match) => match[0]);
      return ['ARTICLE', channelId, articleId, search];
    }

    if (this.channelPageRegex.test(href)) {
      const [channelId, search] = href
        .matchAll(this.channelIdRegex)
        ?.map((match) => match[0]);

      return ['CHANNEL', channelId, null, search];
    }

    if (this.homePageRegex.test(href)) return ['HOME'];

    return ['OTHER'];
  }
}
