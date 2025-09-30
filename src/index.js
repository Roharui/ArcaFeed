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

    // Override console.log
    console.log = function () {
      // Your custom functionality before logging
      helper.log(...arguments);

      // Call the original console.log with the passed arguments
      originalConsoleLog.apply(console, arguments);

      // Your custom functionality after logging (optional)
      // For example, sending logs to a server or performing other actions
    };

    console.error = function () {
      // Your custom functionality before logging
      helper.error(...arguments);

      // Call the original console.log with the passed arguments
      originalConsoleError.apply(console, arguments);

      // Your custom functionality after logging (optional)
      // For example, sending logs to a server or performing other actions
    };

    // console.log(helper);
    // debugger;
  }
})();
