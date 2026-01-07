import '@swiper/swiper.css';
import '@css/arcalive.css';

import { ArcaFeed } from '@/core';

(function () {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEVICE === 'mobile'
  ) {
    import('eruda').then((eruda) => eruda.default.init());
  }
  ArcaFeed.runEvent('init');
})();
