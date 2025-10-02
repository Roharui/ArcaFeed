import type { ConfigImpl, HrefImpl } from '@/types/types';
import type { Swiper, SwiperOptions } from '@swiper/types/index.js';

class Vault {
  href: HrefImpl = {
    mode: 'OTHER',
    channelId: '',
    articleId: '',
    search: '',
  };

  config: ConfigImpl = {
    articleList: [],
    articleFilterConfig: {},
    slideMode: 'REFRESH',
    searchQuery: '',
  };

  swiper?: Swiper;

  swiperOptions?: SwiperOptions;

  constructor() {
    this.swiperOptions = {
      slidesPerView: 1,
      loop: false,
      nested: true,
      touchAngle: 20,
      touchRatio: 0.75,
      threshold: 10,
      shortSwipes: false,
      longSwipesMs: 100,
      longSwipesRatio: 0.1,
      touchMoveStopPropagation: true,
    };
    this.loadConfig();
  }

  toggleSlideMode() {
    this.config.slideMode =
      this.config.slideMode === 'REFRESH' ? 'RENDER' : 'REFRESH';

    this.saveConfig();
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
