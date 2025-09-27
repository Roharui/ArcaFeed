export class RegexManager {
  checkPageMode(href) {
    const homePageRegex = /arca\.live\/?$/;
    const articlePageRegex = /arca\.live\/b\/([A-Za-z0-9])+\/[0-9]+/;
    const channelPageRegex = /arca.live\/b\/(.+)/;

    const channelAndArticleIdRegex = /(?<=\/b\/).+(?=\?)/;
    const channelIdRegex = /(?<=\/b\/).([A-Za-z0-9])+((?=\?)|$)/;

    if (articlePageRegex.test(href)) {
      const [channelId, articleId] = href
        .match(channelAndArticleIdRegex)[0]
        .split('/');
      return ['ARTICLE', channelId, articleId];
    }

    if (channelPageRegex.test(href)) {
      const [channelId] = href.match(channelIdRegex);
      return ['CHANNEL', channelId];
    }

    if (homePageRegex.test(href)) return ['HOME'];

    return ['OTHER'];
  }
}
