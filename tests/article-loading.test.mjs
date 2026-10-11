import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader } from './source-loader.mjs';

test('loading remains active until concurrent requests finish and never underflows', () => {
  const loading = sourceLoader()('src/feature/article/loading.ts');
  const states = [];
  const unsubscribe = loading.subscribeArticleLoading((active) =>
    states.push(active),
  );
  loading.hideFetchLoader();
  loading.showFetchLoader();
  loading.showFetchLoader();
  loading.hideFetchLoader();
  assert.equal(loading.isArticleLoading(), true);
  assert.deepEqual(states, [false, true]);
  loading.hideFetchLoader();
  loading.hideFetchLoader();
  assert.equal(loading.isArticleLoading(), false);
  assert.deepEqual(states, [false, true, false]);
  unsubscribe();
  loading.showFetchLoader();
  loading.hideFetchLoader();
  assert.deepEqual(states, [false, true, false]);
});

test('navigation subscribing after a request starts immediately receives its loading state', () => {
  const loading = sourceLoader()('src/feature/article/loading.ts');
  loading.showFetchLoader();
  const states = [];
  loading.subscribeArticleLoading((active) => states.push(active));
  assert.deepEqual(states, [true]);
  loading.hideFetchLoader();
  assert.deepEqual(states, [true, false]);
});
