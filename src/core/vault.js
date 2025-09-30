export class Vault {
  mode = '';
  channelId = '';
  articleId = '';

  currentSlide = null;

  nextArticleUrl = '';
  prevArticleUrl = '';

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
}
