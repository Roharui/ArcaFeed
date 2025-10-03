import type { PromiseFunc } from '@/types';
import { getRegexMatchByIndex } from '@/utils/type';
import type { Vault } from '@/vault';

const homePageRegex = /arca\.live\/?$/;
const channelPageRegex = /b\/(.+)/;
const articlePageRegex = /b\/([A-Za-z0-9])+\/[0-9]+/;

const channelAndArticleIdRegex =
  /(?<=\/b\/).([A-Za-z0-9]).+(?=\/)|(?<=\/b\/([A-Za-z0-9])+\/).[0-9]+|\?.+/g;
const channelIdRegex = /(?<=\/b\/).([A-Za-z0-9])+|\?.+/g;
const articelIdRegex = /(?<=\/b\/([A-Za-z0-9])+\/).[0-9]+|\?.+/g;

const rootContainerRegex =
  /(?<=\"top\"\>\<\/div\>).+(?=\<div id=\"bottom\")/gs;
const parseContentRegex =
  /\<div class=\"topbar-area.+\<\/a\>\<\/span\>.\s+\<\/div\>|<aside class="sidebar.+<\/aside>|<footer class="footer">.+<\/footer>|<ul class="nav-.+<\/ul>|<div id="toast-box.+<\/div>|<div id="boardBtns">.+clearfix">.+<\/div>|<form action="\/b\/.+(<\/option>.\s+<\/select>).(\s+<\/div>){2}|<div class="included-article-list.+<\/small>.+<\/p>.\s+<\/div>/gs;
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

function checkPageMode(href?: string): PromiseFunc {
  return (v?: Vault) => {
    if (v === undefined) return;

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

      if (matchArr.length < 1) throw Error('Wrong URL From CHANNEL');

      const channelId = matchArr[0] || '';
      const search = matchArr[1] || '';

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

export { checkPageMode, getArticleId, parseContent, getCurrentHTMLTitle };
