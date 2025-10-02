import type { PromiseFunc } from '@/types/func';
import type { Vault } from '@/vault';

const homePageRegex = /arca\.live\/?$/;
const channelPageRegex = /b\/(.+)/;
const articlePageRegex = /b\/([A-Za-z0-9])+\/[0-9]+/;

const channelAndArticleIdRegex =
  /(?<=\/b\/).([A-Za-z0-9]).+(?=\/)|(?<=\/b\/([A-Za-z0-9])+\/).[0-9]+|\?.+/g;
const channelIdRegex = /(?<=\/b\/).([A-Za-z0-9])+|\?.+/g;

function checkPageMode(href: string | null): PromiseFunc {
  return (v: Vault) => {
    const realHref = href || window.location.href;
    console.log('Checking page mode for href:', realHref);

    // ARTICLE: /b/{channelId}/{articleId}
    if (articlePageRegex.test(realHref)) {
      const matchArr = Array.from(
        realHref.matchAll(channelAndArticleIdRegex),
        (match: RegExpMatchArray): string => match[0],
      );

      if (matchArr.length !== 3) throw Error('Wrong URL From ARTICLE');

      const channelId = matchArr[0];
      const articleId = matchArr[1];
      const search = matchArr[2];

      if (!channelId || !articleId || !search)
        throw Error('Wrong URL From ARTICLE');

      v.href = { mode: 'ARTICLE', channelId, articleId, search };
    }
    // CHANNEL: /b/{channelId}
    else if (channelPageRegex.test(realHref)) {
      const matchArr = Array.from(
        realHref.matchAll(channelIdRegex),
        (match) => match[0],
      );

      if (matchArr.length !== 2) throw Error('Wrong URL From CHANNEL');

      const channelId = matchArr[0];
      const search = matchArr[1];

      if (!channelId || !search) throw Error('Wrong URL From CHANNEL');

      v.href = { mode: 'CHANNEL', channelId, articleId: '', search };
    }
    // HOME: arca.live or arca.live?...
    // OTHER: other pages
    else
      v.href = {
        mode: homePageRegex.test(realHref) ? 'HOME' : 'OTHER',
        channelId: '',
        articleId: '',
        search: '',
      };

    return v;
  };
}

export { checkPageMode };
