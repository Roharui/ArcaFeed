import type { HrefImpl } from '@/types';
import type { VaultAdapter } from '@/vault';

import { getRegexMatchByIndex, getRegexMatchByIndexTry } from '@/utils';

const homePageRegex = /arca\.live\/?$/;
const channelPageRegex = /b\/[a-zA-Z0-9]+(\?|\?.+)?$/;
const articlePageRegex = /b\/([A-Za-z0-9])+\/[0-9]+(\?|\?.+)?$/;
const scrapPageRegex = /\/u\/scrap_list(?:\/?|\?.+)?$/i;

// Optimized: Use capturing groups instead of lookbehind/lookahead for better performance
const channelAndArticleIdRegex = /\/b\/([A-Za-z0-9]+)(?:\/([0-9]+))?(\?.+)?/;
const articelIdRegex = /\/b\/[A-Za-z0-9]+\/([0-9]+)(\?.+)?/;

// == FUNCTION ==
//
function getArticleId(href: string): string {
  const articleIdMatch = href.match(articelIdRegex);

  return getRegexMatchByIndex(articleIdMatch, 1);
}

function parseHref(href?: string) {
  const realHref = href || window.location.href;
  const realUrl = new URL(realHref);
  const search = realUrl.search;
  const articleKey = new URLSearchParams(search).get('articleKey') || '';

  console.log('Checking page mode for href:', realHref);

  let hrefObj: HrefImpl;

  // ARTICLE : /b/{channelId}/{articleId}
  if (articlePageRegex.test(realHref)) {
    const matchArr = realHref.match(channelAndArticleIdRegex);

    const channelId = getRegexMatchByIndex(matchArr, 1);
    const articleId = getRegexMatchByIndex(matchArr, 2);
    const search = getRegexMatchByIndexTry(matchArr, 3, '');

    hrefObj = { mode: 'ARTICLE', channelId, articleId, articleKey, search };
  }
  // CHANNEL: /b/{channelId}
  else if (channelPageRegex.test(realHref)) {
    const matchArr = realHref.match(channelAndArticleIdRegex);

    const channelId = getRegexMatchByIndex(matchArr, 1);
    const search = getRegexMatchByIndexTry(matchArr, 3, '');

    hrefObj = { mode: 'CHANNEL', channelId, articleId: '', articleKey, search };
  }
  // SCRAP: /scrap or related scrap list pages
  else if (scrapPageRegex.test(realUrl.pathname)) {
    hrefObj = {
      mode: 'SCRAP',
      channelId: '',
      articleId: '',
      articleKey,
      search,
    };
  }
  // HOME: arca.live or arca.live?...
  // OTHER: other pages
  else
    hrefObj = {
      mode: homePageRegex.test(realHref) ? 'HOME' : 'OTHER',
      channelId: '',
      articleId: '',
      articleKey,
      search: '',
    };

  return hrefObj;
}

function checkPageMode(p: VaultAdapter): VaultAdapter {
  p.href = parseHref(window.location.href);

  return p;
}

export { checkPageMode, getArticleId, parseHref };
