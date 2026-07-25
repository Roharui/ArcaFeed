import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultHomeSeriesState,
  createDefaultUISettings,
  normalizeArticleFilterConfig,
  normalizeArticleList,
  normalizeHomeSeriesState,
  normalizeSeriesSource,
  normalizeStoredIndex,
  normalizeUISettings,
} from '../src/vault/schema.ts';

test('normalizes persisted filters and drops invalid tokens', () => {
  assert.deepEqual(
    normalizeArticleFilterConfig({
      test: {
        tab: [' 정보 ', '', '정보'],
        title: [' 광고 ', 42],
        disableSwiper: true,
        onlyBest: 'yes',
      },
      broken: null,
    }),
    {
      test: {
        tab: ['정보'],
        title: ['광고'],
        disableSwiper: true,
        onlyBest: false,
      },
      broken: {
        tab: [],
        title: [],
        disableSwiper: false,
        onlyBest: false,
      },
    },
  );
});

test('fills missing UI settings and clamps stored content width', () => {
  const normalized = normalizeUISettings({
    hideBlur: false,
    lastModalTab: 'invalid',
    hiddenChannels: [' a ', '', 'a'],
    contentWidth: 99999,
  });

  assert.equal(normalized.hideBlur, false);
  assert.equal(normalized.hideScrollbar, true);
  assert.equal(normalized.lastModalTab, 'filter');
  assert.deepEqual(normalized.hiddenChannels, ['a']);
  assert.equal(normalized.contentWidth, 1400);
});

test('default UI arrays are not shared between state instances', () => {
  const first = createDefaultUISettings();
  const second = createDefaultUISettings();
  first.hiddenChannels.push('test');
  assert.deepEqual(second.hiddenChannels, []);

  const firstHomeSeries = createDefaultHomeSeriesState();
  const secondHomeSeries = createDefaultHomeSeriesState();
  firstHomeSeries.channels.push('test');
  assert.deepEqual(secondHomeSeries.channels, []);
});

test('normalizes article lists and stored indexes defensively', () => {
  assert.deepEqual(
    normalizeArticleList(['/b/a/1', '', '/b/a/1', 3, ' /b/a/2 ']),
    ['/b/a/1', '/b/a/2'],
  );
  assert.equal(normalizeStoredIndex('12'), 12);
  assert.equal(normalizeStoredIndex('-1'), -1);
  assert.equal(normalizeStoredIndex('12px'), -1);
  assert.equal(normalizeStoredIndex('NaN'), -1);
});

test('normalizes scoped home-series state and legacy series mode', () => {
  assert.equal(normalizeSeriesSource('home'), 'home');
  assert.equal(normalizeSeriesSource('unknown', true), 'article');
  assert.equal(normalizeSeriesSource(null), 'none');

  assert.deepEqual(
    normalizeHomeSeriesState({
      channels: [' a ', 'b', 'a'],
      cursors: { a: 123, b: -1, ignored: 999 },
      exhaustedChannels: ['b', 'ignored'],
    }),
    {
      channels: ['a', 'b'],
      cursors: { a: 123 },
      exhaustedChannels: ['b'],
    },
  );
});
