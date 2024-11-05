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

          return isExcludeCategory && isExcludeTitle;
        })
        .map((ele) => $(ele).attr('href'));
    }

    getNextPageUrl() {
      const nextUrl = this.articleList.find((url) => {
        if (this.lastArticleId === undefined) return true;
        return parseInt(getArticleId(url)) < parseInt(this.lastArticleId);
      });

      if (this.articleList.length === 0 || nextUrl === undefined) {
        return $('.page-item.active').next().find('a').attr('href');
      }

      return nextUrl;
    }

    getPrevPageUrl() {
      const prevUrl = this.articleList
        .slice()
        .reverse()
        .find((url) => {
          if (this.lastArticleId === undefined) return true;
          return parseInt(getArticleId(url)) > parseInt(this.lastArticleId);
        });

      if (this.articleList.length === 0 || prevUrl === undefined) {
        return $('.page-item.active').prev().find('a').attr('href');
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

      Promise.all([
        fetch(nextUrl)
          .then((res) => res.text())
          .then((res) => (this.nextArticleHtml = res)),
        prevUrl !== undefined
          ? fetch(prevUrl)
              .then((res) => res.text())
              .then((res) => (this.prevArticleHtml = res))
          : undefined,
      ])
        .then(() => this.reserveActionFn?.apply())
        .then(() => (this.reserveActionFn = undefined))
        .then(() => (this.htmlActive = true));
    }
  };

export { VaultArticle };
