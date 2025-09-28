export class ConfigManager {
  articleFilterConfig = {};
  articleHistory = [];
  slideMode = 'RENDER'; // 'REFRESH', 'RENDER'

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

  loadConfig() {
    const articleFilterConfig = localStorage.getItem('articleFilterConfig');
    if (articleFilterConfig) {
      this.articleFilterConfig = JSON.parse(articleFilterConfig) || {};
    }
    const articleHistory = localStorage.getItem('articleHistory');
    if (articleHistory) {
      this.articleHistory = JSON.parse(articleHistory) || [];
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
    localStorage.setItem('articleHistory', JSON.stringify(this.articleHistory));
    localStorage.setItem('slideMode', this.slideMode);
  }
}
