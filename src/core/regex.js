export class RegexManager {
  homePageRegex = /arca\.live\/?$/;
  articlePageRegex = /arca\.live\/b\/([A-Za-z0-9])+\/[0-9]+/;
  channelPageRegex = /arca.live\/b\/(.+)/;

  channelAndArticleIdRegex = /(?<=\/b\/).+(?=\?)/;
  channelIdRegex = /(?<=\/b\/).([A-Za-z0-9])+((?=\?)|$)/;

  initPageMode(href) {
    const [mode, channelId, articleId] = this.checkPageMode(href);
    this.mode = mode;
    this.channelId = channelId;
    this.articleId = articleId;
  }

  getArticleIdFromHref(href) {
    if (this.articlePageRegex.test(href)) {
      const articleId = href
        .match(this.channelAndArticleIdRegex)[0]
        .split('/')[1];
      return articleId;
    }
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
