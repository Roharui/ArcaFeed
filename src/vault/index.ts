import type { ConfigImpl, HrefImpl } from '@/types';
import type { Swiper, SwiperOptions } from '@swiper/types';

class Vault {
  private _href: HrefImpl = {
    mode: 'OTHER',
    channelId: '',
    articleId: '',
    search: '',
  };

  private _config: ConfigImpl = {
    articleList: [],
    articleFilterConfig: {},
    slideMode: 'REFRESH',
    searchQuery: '',
  };

  private _nextArticleUrl: string | null = null;
  private _prevArticleUrl: string | null = null;

  private _currentSlide: JQuery<HTMLElement> | null = null;

  private _swiper: Swiper | null = null;

  constructor() {
    this.loadConfig();
  }

  get href(): HrefImpl {
    return this._href;
  }

  set href(newHref: HrefImpl) {
    this._href = newHref;
  }

  get config(): ConfigImpl {
    return this._config;
  }

  set config(newConfig: ConfigImpl) {
    this._config = newConfig;
  }

  get nextArticleUrl(): string | null {
    return this._nextArticleUrl;
  }

  set nextArticleUrl(url: string | null) {
    this._nextArticleUrl = url;
  }

  get prevArticleUrl(): string | null {
    return this._prevArticleUrl;
  }

  set prevArticleUrl(url: string | null) {
    this._prevArticleUrl = url;
  }

  get currentSlide(): JQuery<HTMLElement> | null {
    return this._currentSlide;
  }

  set currentSlide(slide: JQuery<HTMLElement> | null) {
    this._currentSlide = slide;
  }

  get swiper(): Swiper | null {
    return this._swiper;
  }

  set swiper(swiperInstance: Swiper | null) {
    this._swiper = swiperInstance;
  }

  isCurrentMode(mode: HrefImpl['mode']): boolean {
    return this.href.mode === mode;
  }

  toggleSlideMode() {
    this.config.slideMode =
      this.config.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';
  }

  loadConfig() {
    const articleFilterConfigStr = localStorage.getItem('articleFilterConfig');
    const articleFilterConfig = articleFilterConfigStr
      ? JSON.parse(articleFilterConfigStr)
      : {};
    const articleListStr = localStorage.getItem('articleList');
    const articleList = articleListStr ? JSON.parse(articleListStr) : [];
    const slideMode =
      (localStorage.getItem('slideMode') as 'REFRESH' | 'RENDER') || 'REFRESH';
    const searchQuery = localStorage.getItem('searchQuery') || '';

    this.config = { articleFilterConfig, articleList, slideMode, searchQuery };
  }

  saveConfig() {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.config.articleFilterConfig),
    );
    localStorage.setItem(
      'articleList',
      JSON.stringify(this.config.articleList),
    );
    localStorage.setItem('slideMode', this.config.slideMode);
    localStorage.setItem('searchQuery', this.config.searchQuery);
  }
}

export { Vault };
