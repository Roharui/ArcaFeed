import eruda from 'eruda';

import { ArcaFeed } from '@/core';

import '@swiper/swiper.css';
import '@css/arcalive.css';

(function () {
  if (process.env.NODE_ENV === 'development') {
    eruda.init();
  }
  ArcaFeed.runEvent('init');
})();
