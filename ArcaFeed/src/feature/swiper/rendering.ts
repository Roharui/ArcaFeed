import { createOffscreenSectionDeferrer } from '@feed/core/feature/swiper/rendering';

export const deferOffscreenArticleSections = createOffscreenSectionDeferrer({
  selector: '.board-article #comment, .board-article .included-article-list',
  classPrefix: 'arcafeed',
});
