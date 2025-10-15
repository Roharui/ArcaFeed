import { Helper } from '@/core';

import '@swiper/swiper.css';
import '@css/arcalive.css';

(function () {
  if (process.env.NODE_ENV === 'production') {
    console.log = () => { }
  }

  const helper = new Helper();
  helper.init();
})();
