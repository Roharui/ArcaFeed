// link

import type { Config, Vault } from "@/vault";
import { FilterManager } from "../filter";

export class FetchManager extends FilterManager {

  constructor(v: Vault, c: Config) {
    super(v, c);
  }

  async fetchFromCurrentSlide(mode: string) {

    const { currentSlide } = this.v;
    const { searchQuery } = this.c;

    if (currentSlide === null) {
      return;
    }

    const searchUrl =
      currentSlide.attr('data-article-href') + searchQuery;

    console.log(`Fetching ${mode} article From Current article: ${searchUrl}`);

    const res = await this.fetchUrl(searchUrl);
    const $html = $(res.responseText);

    this.parseFromArticleList(mode, $html);
  }

  parseFromArticleList(mode: string, $html: JQuery<HTMLElement>) {
    const { href, currentSlide } = this.v;

    if (currentSlide === null) {
      return;
    }

    const $content = ($html || $('.root-container')).find(
      'div.included-article-list',
    );

    const totalLinks = $content
      .find(
        'div.included-article-list > div.article-list > div.list-table.table > a.vrow.column',
      )
      .not('.notice');

    const filteredLinks = this.filterLink(totalLinks);

    if (filteredLinks.length === 0) {
      return;
    }

    const currentArticleId =
      currentSlide.attr('data-article-id')?.trim() || href.articleId;

    if (!currentArticleId) {
      return;
    }

    const index = filteredLinks.findIndex((ele: string) =>
      ele.includes(currentArticleId),
    );

    if (index === -1) {
      return;
    }

    let articleList: string[] = [];

    if (mode !== 'all') {
      articleList =
        mode === 'next'
          ? filteredLinks.slice(index + 1)
          : filteredLinks.slice(0, index - 1);
    }

    if (articleList.length === 0) {
      return;
    }

    if (mode === 'all') {
      this.c.articleList = articleList;
      this.v.nextArticleUrl = articleList[index + 1] || '';
      this.v.prevArticleUrl = articleList[index - 1] || '';
    } else if (mode === 'next') {
      this.c.articleList.push(...articleList);
      this.v.nextArticleUrl = articleList[0] || '';
    } else {
      this.c.articleList.unshift(...articleList);
      this.v.prevArticleUrl = articleList.slice(-1)[0] || '';
    }
  }

  async fetchLoop(mode: string, $slide: JQuery<HTMLElement>) {
    let filteredLinks: string[] = [];
    let url: string | undefined;
    let count: number = 0;

    let $html = $slide || $('.root-container');

    while (url === null && count <= 10) {
      const articlePage = $html.find('.page-item.active');

      const articlePageElement =
        mode === 'next' ? articlePage.next() : articlePage.prev();

      const articlePageUrl = articlePageElement.find('a').attr('href');

      if (!articlePageUrl) return;

      const searchUrl = articlePageUrl.replace('https://arca.live', '');

      console.log(`Fetching ${mode} article page: ${searchUrl}`);

      const res = await this.fetchUrl(`${searchUrl}`);

      $html = $(res.responseText);

      const totalLinks = $html
        .find('div.article-list > div.list-table.table > a.vrow.column')
        .not('.notice');

      filteredLinks = this.filterLink(totalLinks);

      if (filteredLinks.length > 0) {
        url = mode === 'next' ? filteredLinks[0] : filteredLinks.slice(-1)[0];
      }

      if (url !== null) {
        console.log(
          `Fetching Complete ${mode} article page: ${articlePageUrl}`,
        );

        if (mode === 'prev') {
          this.c.articleList.unshift(...filteredLinks);
          this.v.prevArticleUrl = url || '';
        } else {
          this.c.articleList.push(...filteredLinks);
          this.v.nextArticleUrl = url || '';
        }

        return;
      }
      count += 1;

      console.log(
        `No articles found on page ${articlePageUrl}, trying ${mode} page...`,
      );
    }
  }

  async fetchUrl(url: string, method = 'GET', ms = 5000): Promise<{ responseText: string }> {
    return fetch(url, {
      method: method,
      headers: { Origin: 'arca.live' },
      signal: AbortSignal.timeout(ms)
    })
      .then((response) => response.text())
      .then((text) => ({ responseText: text }));
  }
}
