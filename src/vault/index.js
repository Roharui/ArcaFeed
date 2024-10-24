import { getArticleId, getChannelId } from 'src/utils/url';

const DEFAULT_CONFIG = {
  pageFilter: {},
  viewer: {
    fitScreen: false,
    defaultStart: false,
    hideOriImg: false,
  },
  btn: {
    nextBtn: true,
    navExpand: true,
  },
};

const DEFAULT_VAULT = {
  urlSort: [],
  articeList: [],
  nextArticleUrl: '',
  nextArticleHtml: '',
  prevArticleUrl: '',
  prevArticleHtml: '',
  htmlActive: false,
  reserveAction: undefined,
  lastArticleId: getArticleId(),
};

class Vault {
  static instance = null;

  constructor() {
    if (Vault.instance) return Vault.instance;

    this.config = localStorage.getItem('aralive_helper_config')
      ? JSON.parse(localStorage.getItem('aralive_helper_config'))
      : { ...DEFAULT_CONFIG };

    this.data = { ...DEFAULT_VAULT };
    this.gallery = null;

    Vault.instance = this;
  }

  getHtml(url) {
    if (this.data.nextArticleUrl === url) return this.data.nextArticleHtml;
    if (this.data.prevArticleUrl === url) return this.data.prevArticleHtml;
  }

  getEventType() {
    const gallery = this.gallery;
    if (
      gallery !== null &&
      (gallery.showing || gallery.isShown || gallery.showing)
    )
      return 'VIEWER';
    return 'DEFAULT';
  }

  getPageFilter(channelId) {
    if ((!channelId) in this.config.pageFilter) return;
    return this.config.pageFilter[channelId];
  }

  setPageFilter(channelId, pageFilter) {
    this.config.pageFilter[channelId] = pageFilter;
    this.setPageUrl();
    this.saveConfig();
  }

  setConfig(type, config) {
    this.config[type] = Object.assign(this.config[type], config);
    this.saveConfig();
  }

  saveConfig() {
    localStorage.setItem('aralive_helper_config', JSON.stringify(this.config));
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

    const { excludeCategory, excludeTitle } = this.getPageFilter(channelId) ?? {
      excludeCategory: [],
      excludeTitle: [],
    };

    return rows
      .filter((ele) => {
        if (excludeCategory.length == 0 && excludeTitle.length == 0) {
          return true;
        }

        const tabTypeText = $(ele).find('.badge-success').text();
        const titleText = $(ele).find('.title').text();
        const mediaIcon = $(ele).find('.ion-ios-photos-outline').length > 0;

        let isExcludeCategory = true;

        if (excludeCategory.length != 0) {
          isExcludeCategory =
            excludeCategory.every((ele) => !tabTypeText.includes(ele)) &&
            !(
              tabTypeText.length == 0 &&
              ((!mediaIcon && excludeCategory.includes('노탭')) ||
                (mediaIcon && excludeCategory.includes('노탭(이미지)')))
            );
        }

        let isExcludeTitle = true;

        if (excludeTitle.length != 0) {
          isExcludeTitle = excludeTitle.every(
            (cur) => !titleText.includes(cur),
          );
        }

        return isExcludeCategory && isExcludeTitle;
      })
      .map((ele) => $(ele).attr('href'));
  }

  getNextPageUrl() {
    const nextUrl = this.data.articeList.find((url) => {
      if (this.data.lastArticleId === undefined) return true;
      return parseInt(getArticleId(url)) < parseInt(this.data.lastArticleId);
    });

    if (this.data.articeList.length === 0 || nextUrl === undefined) {
      return $('.page-item.active').next().find('a').attr('href');
    }

    return nextUrl;
  }

  getPrevPageUrl() {
    const prevUrl = this.data.articeList
      .slice()
      .reverse()
      .find((url) => {
        if (this.data.lastArticleId === undefined) return true;
        return parseInt(getArticleId(url)) > parseInt(this.data.lastArticleId);
      });

    if (this.data.articeList.length === 0 || prevUrl === undefined) {
      return $('.page-item.active').prev().find('a').attr('href');
    }

    return prevUrl;
  }

  reserveAction(fn) {
    if (this.data.htmlActive) {
      fn();
      return;
    }

    this.data.reserveAction = fn;
  }

  setPageUrl() {
    const articleList = $(`a.vrow.column`)
      .map(function () {
        return this;
      })
      .get();
    this.data.articeList = this.filterLink(articleList);

    this.data.htmlActive = false;

    const nextUrl = this.getNextPageUrl();
    const prevUrl = this.getPrevPageUrl();

    this.data.nextArticleUrl = nextUrl;
    this.data.prevArticleUrl = prevUrl;

    Promise.all([
      fetch(nextUrl)
        .then((res) => res.text())
        .then((res) => (this.data.nextArticleHtml = res)),
      prevUrl !== undefined
        ? fetch(prevUrl)
            .then((res) => res.text())
            .then((res) => (this.data.prevArticleHtml = res))
        : undefined,
    ])
      .then(() => this.data.reserveAction?.apply())
      .then(() => (this.data.reserveAction = undefined))
      .then(() => (this.data.htmlActive = true));
  }

  setLastArticle(articleId, force = false) {
    if (!articleId && !force) return;
    this.data.lastArticleId = articleId;
  }

  setGallery(g) {
    this.gallery = g;
  }

  runViewer(f) {
    if (this.gallery == null) return;
    f(this.gallery);
  }
}

export { Vault };
