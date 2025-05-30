import { getArticleId, getChannelId } from 'src/utils/url';

const VaultArticle = (superClass) =>
  class extends superClass {
    constructor() {
      super();

      return Object.assign(this, {
        urlSort: [],
        articleList: [],
        nextArticleUrl: '',
        nextArticleHtml: '',
        prevArticleUrl: '',
        prevArticleHtml: '',
        htmlActive: false,
        reserveActionFn: undefined,
        lastArticleId: getArticleId(),
      });
    }

    getHtml(url) {
      if (this.nextArticleUrl === url) return this.nextArticleHtml;
      if (this.prevArticleUrl === url) return this.prevArticleHtml;
    }

    filterLink(rows) {
      rows = rows.filter(
        (ele) =>
          !(
            $(ele).hasClass('notice') ||
            $(ele).hasClass('head') ||
            $(ele).attr('href').includes('#c_')
          ),
      );

      const channelId = getChannelId();

      const { excludeCategory, excludeTitle } = this.getPageFilter(
        channelId,
      ) ?? {
        excludeCategory: [],
        excludeTitle: [],
      };

      return rows
        .filter((ele) => {
          if (excludeCategory.length == 0 && excludeTitle.length == 0) {
            return true;
          }

          const _tabTypeText = $(ele).find('.badge-success').text();
          const tabTypeText = _tabTypeText.length === 0 ? '노탭' : _tabTypeText;

          const titleText = $(ele).find('.title').text();

          const isExcludeCategory =
            excludeCategory.length == 0 ||
            !excludeCategory.includes(tabTypeText);

          const isExcludeTitle =
            excludeTitle.length == 0 ||
            excludeTitle.every((cur) => !titleText.includes(cur));

          const result = isExcludeCategory && isExcludeTitle;

          if (this.config.hide.hideTab && !result) {
            $(ele).hide();
          }

          return result;
        })
        .map((ele) => $(ele).attr('href'));
    }

    getNextPageUrl() {
      const nextPageUrl = $('.page-item.active').next().find('a').attr('href');

      let tmp = false;

      if (this.articleList.length === 0) {
        return nextPageUrl;
      }

      const nextUrl = this.articleList.find((url) => {
        if (tmp) return true;
        if (this.lastArticleId === undefined) return true;
        if (parseInt(getArticleId(url)) == parseInt(this.lastArticleId))
          tmp = true;
      });

      if (nextUrl == undefined && tmp) {
        return nextPageUrl;
      }

      if (nextUrl == undefined && !tmp) {
        return this.articleList[0];
      }

      return nextUrl;
    }

    getPrevPageUrl() {
      const prevPageUrl = $('.page-item.active').prev().find('a').attr('href');
      const articleListReverse = this.articleList.slice().reverse();

      let tmp = false;

      if (articleListReverse.length === 0) {
        return prevPageUrl;
      }

      const prevUrl = articleListReverse.find((url) => {
        if (tmp) return true;
        if (this.lastArticleId === undefined) return true;
        if (parseInt(getArticleId(url)) == parseInt(this.lastArticleId))
          tmp = true;
      });

      if (prevUrl == undefined && tmp) {
        return prevPageUrl;
      }

      if (prevUrl == undefined && !tmp) {
        return articleListReverse[0];
      }

      return prevUrl;
    }

    reserveAction(fn) {
      if (this.htmlActive) {
        fn();
        return;
      }

      this.reserveActionFn = fn;
    }

    setLastArticle(articleId, force = false) {
      if (!articleId && !force) return;
      this.lastArticleId = articleId;
    }

    // main
    setPageUrl() {
      // <link rel="preload" href="<your_image_source_here>" as="image">
      const articleList = $(`a.vrow.column`)
        .map(function () {
          return this;
        })
        .get();
      this.articleList = this.filterLink(articleList);

      this.htmlActive = false;

      const nextUrl = this.getNextPageUrl();
      const prevUrl = this.getPrevPageUrl();

      this.nextArticleUrl = nextUrl;
      this.prevArticleUrl = prevUrl;

      const promiseList = [];

      const nextUrlPromise = fetch(nextUrl)
        .then((res) => res.text())
        .then((res) => (this.nextArticleHtml = res));
      const prevUrlPromise = fetch(prevUrl)
        .then((res) => res.text())
        .then((res) => (this.prevArticleHtml = res));

      promiseList.push(nextUrlPromise);
      if (prevUrl !== undefined) {
        promiseList.push(prevUrlPromise);
      }

      Promise.all(promiseList)
        .then(() => this.reserveActionFn?.apply())
        .then(() => (this.reserveActionFn = undefined))
        .then(() => (this.htmlActive = true));
    }
  };

export { VaultArticle };
