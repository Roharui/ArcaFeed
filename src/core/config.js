export class ConfigManager {
  articleFilterConfig = {};

  articleList = [];

  slideMode = 'REFRESH'; // 'REFRESH', 'RENDER'

  slideOptions = {
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

  clearArticle() {
    this.articleList = [];
  }

  toggleSlideMode() {
    if (this.slideMode === 'REFRESH') {
      this.slideMode = 'RENDER';
    } else {
      this.slideMode = 'REFRESH';
    }
    this.saveConfig();
  }

  loadConfig() {
    const articleFilterConfig = localStorage.getItem('articleFilterConfig');
    if (articleFilterConfig) {
      this.articleFilterConfig = JSON.parse(articleFilterConfig) || {};
    }
    const articleList = localStorage.getItem('articleList');
    if (articleList) {
      this.articleList = JSON.parse(articleList) || [];
    }
    const slideMode = localStorage.getItem('slideMode');
    if (slideMode) {
      this.slideMode = slideMode;
    }
  }

  saveConfig() {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem('articleList', JSON.stringify(this.articleList));
    localStorage.setItem('slideMode', this.slideMode);
  }
}
