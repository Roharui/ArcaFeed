import {
  createSwipeCompositing,
  installReducedMotion,
  updateAfterSwipe,
} from '@feed/core/feature/swiper/motion';
import { afterPaint } from '@/utils/after-paint';

export { installReducedMotion, updateAfterSwipe };

export const installSwipeCompositing = createSwipeCompositing({
  classPrefix: 'arcafeed',
  appName: 'ArcaFeed',
  afterPaint,
});
