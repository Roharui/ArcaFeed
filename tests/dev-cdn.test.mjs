import assert from 'node:assert/strict';
import test from 'node:test';
import createCdnConfig from '../webpack.config.cdn.js';
import { sourceLoader } from './source-loader.mjs';

test('CDN mobile initialization displays the version without reloading', () => {
  const config = createCdnConfig({
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
  const appended = [];
  let reloads = 0;
  const { addVersionInfo } = sourceLoader({
    globals: {
      process: { env },
      window: { location: { reload: () => reloads++ } },
      localStorage: {
        getItem() {
          throw new Error('CDN initialization must not access reload state');
        },
      },
    },
    mocks: {
      jquery: {
        default(selector, attributes) {
          return attributes || { append: (element) => appended.push(element) };
        },
      },
    },
  })('src/feature/version.ts');

  addVersionInfo({});
  assert.equal(reloads, 0);
  assert.equal(appended.length, 1);
  assert.match(appended[0].text, /^ArcaFeed Version:/);
  assert.equal(config.externals.jquery, 'jQuery');
  assert.equal(config.externals.swiper, 'Swiper');
  assert.equal(config.mode, 'production');
  assert.equal(config.devtool, false);
});
