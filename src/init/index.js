const { globalInit } = require('./globalInit');
const { renderInit } = require('./renderInit');

function init() {
  globalInit();
  renderInit();
}

export { init };
