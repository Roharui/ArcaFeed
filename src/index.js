import Helper from './core';

import 'jquery-ui';
import 'jquery-ui-css';

import 'arcalive-css';
import 'swiper/css';

(function () {
  const helper = new Helper();
  if (process.env.NODE_ENV === 'development') {
    console.log(helper);
    // debugger;
  }
})();
