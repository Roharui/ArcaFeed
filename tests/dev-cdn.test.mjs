import assert from 'node:assert/strict';
import test from 'node:test';
import { domFixture } from './dom-fixture.mjs';
import { createCdnConfig } from '../../webpack.config.dev.js';
import { sourceLoader } from './source-loader.mjs';

test('CDN mobile initialization displays the version without reloading', () => {
  const config = createCdnConfig({
    APP: 'rulifeed',
    CDN_URL: 'https://cdn.example.com/dev/',
    DEVICE: 'mobile',
  });
  const definitions = config.plugins.find(
    (plugin) => plugin.definitions,
  ).definitions;
  const env = Object.fromEntries(
    Object.entries(definitions).map(([key, value]) => [
      key.replace('process.env.', ''),
      JSON.parse(value),
    ]),
  );
  const dom = domFixture('<footer></footer>');
  let reloads = 0;
  const { addVersionInfo } = sourceLoader({
    globals: {
      ...dom,
      process: { env },
      window: { location: { reload: () => reloads++ } },
      localStorage: {
        getItem() {
          throw new Error('CDN initialization must not access reload state');
        },
      },
    },
  })('src/feature/version.ts');

  addVersionInfo({});
  assert.equal(reloads, 0);
  assert.match(
    dom.document.querySelector('footer').textContent,
    /^RuliFeed Version:/,
  );
  assert.equal(config.externals.swiper, 'Swiper');
  assert.equal(config.mode, 'production');
  assert.equal(config.devtool, false);
});
