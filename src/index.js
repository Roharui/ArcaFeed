import Helper from './core';

import 'jquery-ui';
import 'jquery-ui-css';

import 'arcalive-css';
import 'swiper/css';

(function () {
  const helper = new Helper();

  if (process.env.NODE_ENV === 'development') {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = function () {
      helper.log(...arguments);

      originalConsoleLog.apply(console, arguments);
    };

    console.error = function () {
      helper.error(...arguments);

      originalConsoleError.apply(console, arguments);
    };
  }
})();
