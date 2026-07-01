import '@css/swiper.css';
import '@css/arcalive.css';

import { ArcaFeed, eventBus } from '@/core';

// Ensure ArcaFeed singleton is created (registers EventBus listeners)
new ArcaFeed();

(function () {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEVICE === 'mobile'
  ) {
    import('eruda').then((eruda) => eruda.default.init());
  }
  eventBus.emit('init');
})();
