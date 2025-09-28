export class RegexManager {
  homePageRegex = /arca\.live\/?$/;
  articlePageRegex = /arca\.live\/b\/([A-Za-z0-9])+\/[0-9]+/;
  channelPageRegex = /arca.live\/b\/(.+)/;

  channelAndArticleIdRegex = /(?<=\/b\/).+(?=\?)/;
  channelIdRegex = /(?<=\/b\/).([A-Za-z0-9])+((?=\?)|$)/;

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
