import { Vault } from './vault';

export class RegexManager extends Vault {
  homePageRegex = /arca\.live\/?$/;
  channelPageRegex = /b\/(.+)/;
  articlePageRegex = /b\/([A-Za-z0-9])+\/[0-9]+/;

  channelAndArticleIdRegex = /(?<=\/b\/).([A-Za-z0-9])+\/.[0-9]+/;
  channelIdRegex = /(?<=\/b\/).([A-Za-z0-9])+/;

  initPageMode(href) {
    const [mode, channelId, articleId] = this.checkPageMode(href);

    this.mode = mode;
    this.channelId = channelId;
    this.articleId = articleId;
  }

  getArticleIdFromHref(href) {
    const articleMatch = href.match(this.channelAndArticleIdRegex);

    if (!articleMatch.length) return null;

    const articleId = articleMatch[0].split('/')[1];

    return articleId;
  }

  checkPageMode(href) {
    if (this.articlePageRegex.test(href)) {
      const [channelId, articleId] = href
        .match(this.channelAndArticleIdRegex)[0]
        .split('/');
      return ['ARTICLE', channelId, articleId];
    }

    if (this.channelPageRegex.test(href)) {
      const [channelId] = href.match(this.channelIdRegex);
      return ['CHANNEL', channelId];
    }

    if (this.homePageRegex.test(href)) return ['HOME'];

    return ['OTHER'];
  }
}
