export class ConfigManager {
  articleFilterConfig = {};

  articleList = [];
  articleTitleList = [];

  slideMode = 'REFRESH'; // 'REFRESH', 'RENDER'

  slideOptions = {
    slidesPerView: 1,
    loop: true,
    nested: true,
    touchAngle: 20,
    touchRatio: 0.75,
    threshold: 10,
    shortSwipes: false,
    longSwipesMs: 100,
    longSwipesRatio: 0.1,
    touchMoveStopPropagation: true,
  };

  clearHistory() {
    this.articleList = [];
    this.articleTitleList = [];
  }

  async loadConfig() {
    const articleFilterConfig = localStorage.getItem('articleFilterConfig');
    if (articleFilterConfig) {
      this.articleFilterConfig = JSON.parse(articleFilterConfig) || {};
    }
    const articleList = localStorage.getItem('articleList');
    if (articleList) {
      this.articleList = JSON.parse(articleList) || [];
    }
    const articleTitleList = localStorage.getItem('articleTitleList');
    if (articleTitleList) {
      this.articleTitleList = JSON.parse(articleTitleList) || [];
    }
    const slideMode = localStorage.getItem('slideMode');
    if (slideMode) {
      this.slideMode = slideMode;
    }
    this.slideMode = 'RENDER';
  }

  async saveConfig() {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem('articleList', JSON.stringify(this.articleList));
    localStorage.setItem(
      'articleTitleList',
      JSON.stringify(this.articleTitleList),
    );
    localStorage.setItem('slideMode', this.slideMode);
  }
}
