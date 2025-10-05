import type { HrefImpl } from '@/types';
import type { Param } from '@/vault';

import { getRegexMatchByIndex, getRegexMatchByIndexTry } from '@/utils/type';

const homePageRegex = /arca\.live\/?$/;
const channelPageRegex = /b\/(.+)/;
const articlePageRegex = /b\/([A-Za-z0-9])+\/[0-9]+/;

const channelAndArticleIdRegex =
  /(?<=\/b\/).([A-Za-z0-9])+|(?<=\/b\/([A-Za-z0-9])+\/).[0-9]+|\?.+/g;
const articelIdRegex = /(?<=\/b\/([A-Za-z0-9])+\/).[0-9]+|\?.+/g;

const rootContainerRegex =
  /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/gs;
const parseContentRegex =
  /\<div class=\"topbar-area.+\<\/a\>\<\/span\>.\s+\<\/div\>|<aside class="sidebar.+<\/aside>|<footer class="footer">.+<\/footer>|<ul class="nav-.+<\/ul>|<div id="toast-box.+<\/div>|<div id="boardBtns">.+clearfix">.+<\/div>|<form action="\/b\/.+(<\/option>.\s+<\/select>).(\s+<\/div>){2}|<div class="included-article-list.+<\/small>.+<\/p>.+<\/div>/gs;
const titleContentRegex = /(?<=title\>).+-.+(?=\<\/title)/s;

function getCurrentHTMLTitle(responseText: string): string {
  const content = responseText.match(titleContentRegex);

  return getRegexMatchByIndex(content, 0);
}

function parseContent(responseText: string): string {
  const content = responseText.match(
    rootContainerRegex,
  );

  const rootContainer = getRegexMatchByIndex(content, 0);

  const html = rootContainer.replace(
    parseContentRegex,
    '',
  );

  return html;
}


function getArticleId(href: string): string {
  const articleIdMatch = href.match(articelIdRegex)

  return getRegexMatchByIndex(articleIdMatch, 0)
}

function parseHref(href?: string) {
  const realHref = href || window.location.href;
  console.log('Checking page mode for href:', realHref);

  let hrefObj: HrefImpl;

  if (articlePageRegex.test(realHref)) {
    const matchArr = realHref.match(channelAndArticleIdRegex);

    const channelId = getRegexMatchByIndex(matchArr, 0);
    const articleId = getRegexMatchByIndex(matchArr, 1);
    const search = getRegexMatchByIndexTry(matchArr, 2, '');

    hrefObj = { mode: 'ARTICLE', channelId, articleId, search };
  }
  // CHANNEL: /b/{channelId}
  else if (channelPageRegex.test(realHref)) {
    const matchArr = realHref.match(channelAndArticleIdRegex);

    const channelId = getRegexMatchByIndex(matchArr, 0)
    const search = getRegexMatchByIndexTry(matchArr, 1, '')

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

function checkPageMode({ v }: Param): Param {
  v.href = parseHref(window.location.href);

  return { v } as Param;
}

export { checkPageMode, getArticleId, parseContent, parseHref, getCurrentHTMLTitle };
