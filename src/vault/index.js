import { getArticleId, getChannelId } from 'src/utils/url';

const DEFAULT_CONFIG = {
  pageFilter: {},
  viewer: {
    fitScreen: false,
    defaultStart: false,
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
    this.loadArticleUrlList();
    this.saveConfig();
  }

  setConfig(type, config) {
    this.config[type] = config;
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

    let pageFilter = this.getPageFilter(channelId);

    if (pageFilter === undefined) {
      pageFilter = {
        excludeCategory: [],
        excludeTitle: [],
      };
    }

    let { excludeCategory, excludeTitle } = pageFilter;

    return rows
      .filter((ele) => {
        if (excludeCategory.length == 0 && excludeTitle.length == 0) {
          return true;
        }

        let tabTypeText = $(ele).find('.badge-success').text();
        let titleText = $(ele).find('.title').text();

        let isExcludeCategory = true;

        if (excludeCategory.length != 0) {
          isExcludeCategory = excludeCategory.reduce(
            (prev, cur) =>
              prev &&
              !tabTypeText.includes(cur) &&
              !(tabTypeText.length == 0 && cur == '노탭'),
            true,
          );
        }

        let isExcludeTitle = true;

        if (excludeTitle.length != 0) {
          isExcludeTitle = excludeTitle.reduce(
            (prev, cur) => prev && !titleText.includes(cur),
            true,
          );
        }

        return isExcludeCategory && isExcludeTitle;
      })
      .map((ele) => $(ele).attr('href'));
  }

  loadArticleUrlList() {
    const articleList = $(`a.vrow.column`)
      .map(function () {
        return this;
      })
      .get();
    this.data.articeList = this.filterLink(articleList);
  }

  getNextPageUrl() {
    const idx = this.data.articeList.findIndex((url) => {
      return url.includes(this.data.lastArticleId);
    });

    let nextUrl = '';

    if (
      this.data.articeList.length === 0 ||
      this.data.articeList.length <= idx + 1
    ) {
      nextUrl = $('.page-item.active').next().find('a').attr('href');
    } else {
      nextUrl = this.data.articeList[idx + 1];
    }

    return nextUrl;
  }

  getPrevPageUrl() {
    const idx = this.data.articeList.findIndex((url) => {
      return url.includes(this.data.lastArticleId);
    });

    let prevUrl = '';

    if (this.data.articeList.length === 0 || idx === 0) {
      prevUrl = $('.page-item.active').prev().find('a').attr('href');
    } else if (idx === -1) {
      prevUrl = this.data.articeList[this.data.articeList.length - 1];
    } else {
      prevUrl = this.data.articeList[idx - 1];
    }

    return prevUrl;
  }

  setPageUrl() {
    const nextUrl = this.getNextPageUrl();
    const prevUrl = this.getPrevPageUrl();

    this.data.nextArticleUrl = nextUrl;
    this.data.prevArticleUrl = prevUrl;

    console.log({
      nextUrl,
      prevUrl,
    });

    fetch(nextUrl)
      .then((res) => res.text())
      .then((res) => (this.data.nextArticleHtml = res));

    if (prevUrl === undefined) return;

    fetch(prevUrl)
      .then((res) => res.text())
      .then((res) => (this.data.prevArticleHtml = res));
  }

  setLastArticle(articleId) {
    this.data.lastArticleId = articleId ?? this.data.lastArticleId;
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
