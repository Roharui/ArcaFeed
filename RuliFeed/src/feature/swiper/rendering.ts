import { createOffscreenSectionDeferrer } from '@feed/core/feature/swiper/rendering';

export const deferOffscreenArticleSections = createOffscreenSectionDeferrer({
  selector: '#board_read #cmt, #board_list',
  classPrefix: 'rulifeed',
});
