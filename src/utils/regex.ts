import type { HrefImpl } from '@/types';
import type { Vault } from '@/vault';

import { getRegexMatchByIndex, getRegexMatchByIndexTry } from '@/utils';

const homePageRegex = /arca\.live\/?$/;
const channelPageRegex = /b\/[a-zA-Z0-9]+/;
const articlePageRegex = /b\/([A-Za-z0-9])+\/[0-9]+/;

// Optimized: Use capturing groups instead of lookbehind/lookahead for better performance
const channelAndArticleIdRegex = /\/b\/([A-Za-z0-9]+)(?:\/([0-9]+))?(\?.+)?/;
const articelIdRegex = /\/b\/[A-Za-z0-9]+\/([0-9]+)(\?.+)?/;

// == FUNCTION ==
//
function getArticleId(href: string): string {
  const articleIdMatch = href.match(articelIdRegex);

  return getRegexMatchByIndex(articleIdMatch, 1); // Changed from 0 to 1 for capturing group
}

function parseHref(href?: string) {
  const realHref = href || window.location.href;

  console.log('Checking page mode for href:', realHref);

  let hrefObj: HrefImpl;

  // ARTICLE : /b/{channelId}/{articleId}
  if (articlePageRegex.test(realHref)) {
    const matchArr = realHref.match(channelAndArticleIdRegex);

    const channelId = getRegexMatchByIndex(matchArr, 1); // Changed from 0 to 1 for capturing group
    const articleId = getRegexMatchByIndex(matchArr, 2); // Changed from 1 to 2 for capturing group
    const search = getRegexMatchByIndexTry(matchArr, 3, ''); // Changed from 2 to 3 for capturing group

    hrefObj = { mode: 'ARTICLE', channelId, articleId, search };
  }
  // CHANNEL: /b/{channelId}
  else if (channelPageRegex.test(realHref)) {
    const matchArr = realHref.match(channelAndArticleIdRegex);

    const channelId = getRegexMatchByIndex(matchArr, 1); // Changed from 0 to 1 for capturing group
    const search = getRegexMatchByIndexTry(matchArr, 3, ''); // Changed from 1 to 3 for capturing group

    hrefObj = { mode: 'CHANNEL', channelId, articleId: '', search };
  }
  // HOME: arca.live or arca.live?...
  // OTHER: other pages
  else
    hrefObj = {
      mode: homePageRegex.test(realHref) ? 'HOME' : 'OTHER',
      channelId: '',
      articleId: '',
      search: '',
    };

  return hrefObj;
}

function checkPageMode(p: Vault): Vault {
  p.href = parseHref(window.location.href);

  return p;
}

export { checkPageMode, getArticleId, parseHref };
