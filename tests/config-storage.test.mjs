import assert from 'node:assert/strict';
import test from 'node:test';
import { memoryStorage, sourceLoader } from './source-loader.mjs';

function fixture(initial = {}) {
  const storage = memoryStorage(initial);
  const reads = [];
  const getItem = storage.getItem.bind(storage);
  storage.getItem = (key) => {
    reads.push(key);
    return getItem(key);
  };
  const load = sourceLoader();
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigStorage } = load('src/vault/config-storage.ts');
  const { mergeState } = load('src/vault/lazy-state.ts');
  return {
    storage,
    reads,
    config: new ConfigStorage(new StorageRepository(storage)),
    mergeState,
  };
}

const filter = {
  title: ['keyword'],
  tab: [],
  disableSwiper: false,
  onlyBest: false,
};

test('one channel lookup reads no other filters and channel enumeration loads only the index', () => {
  const { config, reads, storage } = fixture({
    'arcaFeed:filterChannels': '["first","second"]',
    'arcaFeed:channelFilter:first': JSON.stringify(filter),
    'arcaFeed:channelFilter:second': JSON.stringify(filter),
  });
  const filters = config.filters('session');
  assert.deepEqual(reads, []);
  assert.deepEqual(filters.first, filter);
  assert.ok(!reads.includes('arcaFeed:channelFilter:second'));
  reads.length = 0;
  assert.equal(filters.first, filters.first);
  assert.deepEqual(reads, []);
  assert.deepEqual(Object.keys(filters), ['first', 'second']);
  assert.deepEqual(reads, ['arcaFeed:filterChannels']);
  assert.equal(Object.hasOwn(filters, 'missing'), false);
  assert.equal(storage.writes.length, 0);
});

test('changing a channel preserves other lazy filters and saving touches only that channel', () => {
  const { config, reads, storage, mergeState } = fixture({
    'arcaFeed:filterChannels': '["first","second"]',
    'arcaFeed:channelFilter:first': JSON.stringify(filter),
    'arcaFeed:channelFilter:second': JSON.stringify(filter),
  });
  const previous = config.filters('session');
  const next = mergeState(previous, { first: { ...filter, onlyBest: true } });
  config.saveFilters(next, previous);
  assert.ok(!reads.includes('arcaFeed:channelFilter:second'));
  assert.deepEqual(
    storage.writes.map(({ key }) => key),
    ['arcaFeed:channelFilter:first'],
  );
  assert.deepEqual(config.filters('session').second, filter);
  config.saveFilters({ first: next.first }, next);
  assert.equal(storage.getItem('arcaFeed:channelFilter:second'), null);
  assert.deepEqual(Object.keys(config.filters('session')), ['first']);
});

test('display, reading, subscription and modal preferences load independently', () => {
  const { config, reads, storage } = fixture({
    'arcaFeed:settingsVersion': '2',
    'arcaFeed:displaySettings': '{"contentWidth":800}',
    'arcaFeed:readingSettings':
      '{"skipVisitedContexts":{"channel:first":true}}',
    'arcaFeed:subscriptionSettings':
      '{"hiddenChannels":["second"],"homeSeriesChannels":["first"]}',
    'arcaFeed:lastModalTab': 'history',
  });
  const settings = config.settings();
  assert.deepEqual(reads, []);
  assert.equal(settings.contentWidth, 800);
  assert.deepEqual(reads, [
    'arcaFeed:settingsVersion',
    'arcaFeed:displaySettings',
  ]);
  reads.length = 0;
  assert.equal(settings.hideBlur, true);
  assert.deepEqual(reads, []);
  assert.equal(settings.lastModalTab, 'history');
  assert.deepEqual(reads, ['arcaFeed:lastModalTab']);
  reads.length = 0;
  assert.equal(settings.skipVisitedContexts['channel:first'], true);
  assert.deepEqual(reads, ['arcaFeed:readingSettings']);
  reads.length = 0;
  assert.deepEqual(settings.hiddenChannels, ['second']);
  assert.deepEqual(reads, ['arcaFeed:subscriptionSettings']);
  assert.equal(storage.writes.length, 0);
});

test('saving modal preference leaves display, reading and subscription data unread', () => {
  const { config, reads, storage, mergeState } = fixture({
    'arcaFeed:settingsVersion': '2',
    'arcaFeed:lastModalTab': 'filter',
    'arcaFeed:displaySettings': '{"contentWidth":800}',
    'arcaFeed:subscriptionSettings': '{"hiddenChannels":["keep"]}',
  });
  const previous = config.settings();
  const next = mergeState(previous, { lastModalTab: 'ui' });
  config.saveSettings(next, previous);
  assert.ok(
    reads.every((key) =>
      ['arcaFeed:lastModalTab', 'arcaFeed:settingsVersion'].includes(key),
    ),
  );
  assert.deepEqual(
    storage.writes.map(({ key }) => key),
    ['arcaFeed:lastModalTab'],
  );
  reads.length = 0;
  storage.writes.length = 0;
  const resized = mergeState(next, { contentWidth: 900 });
  config.saveSettings(resized, next);
  assert.ok(!reads.includes('arcaFeed:subscriptionSettings'));
  assert.ok(!reads.includes('arcaFeed:readingSettings'));
  assert.deepEqual(
    storage.writes.map(({ key }) => key),
    ['arcaFeed:displaySettings'],
  );
});

test('temporary migration preserves legacy filters and settings then stops reading legacy keys', () => {
  const { config, storage, reads } = fixture({
    'arcaFeed:articleFilterConfig': JSON.stringify({
      first: filter,
      second: filter,
    }),
    'arcaFeed:uiSettings':
      '{"contentWidth":850,"hiddenChannels":["second"],"skipVisitedContexts":{"channel:first":true},"lastModalTab":"resume"}',
  });
  assert.deepEqual(config.filters('session').first, filter);
  const settings = config.settings();
  assert.equal(settings.contentWidth, 850);
  assert.deepEqual(settings.hiddenChannels, ['second']);
  assert.equal(settings.skipVisitedContexts['channel:first'], true);
  assert.equal(settings.lastModalTab, 'resume');
  reads.length = 0;
  storage.writes.length = 0;
  assert.deepEqual(config.filters('session').second, filter);
  assert.equal(config.settings().contentWidth, 850);
  assert.ok(!reads.includes('arcaFeed:articleFilterConfig'));
  assert.ok(!reads.includes('arcaFeed:uiSettings'));
  assert.equal(storage.writes.length, 0);
});

test('split configuration validates malformed records and honors deletion and isolated defaults', () => {
  const { config, storage } = fixture({
    'arcaFeed:filterChannels': '["first",null,"first","bad:id"]',
    'arcaFeed:channelFilter:first': '{"tab":["image",2],"onlyBest":"true"}',
    'arcaFeed:settingsVersion': '2',
    'arcaFeed:displaySettings': '{"contentWidth":99999,"hideBlur":"false"}',
    'arcaFeed:subscriptionSettings': '{"hiddenChannels":"wrong"}',
    'arcaFeed:readingSettings':
      '{"skipVisitedContexts":{"invalid":true,"channel:first":"true"}}',
    'arcaFeed:lastModalTab': 'unknown',
  });
  assert.deepEqual(Object.keys(config.filters('session')), ['first']);
  assert.deepEqual(config.filters('session').first, {
    tab: ['image'],
    title: [],
    disableSwiper: false,
    onlyBest: false,
  });
  const settings = config.settings();
  assert.equal(settings.contentWidth, 1400);
  assert.equal(settings.hideBlur, true);
  assert.deepEqual(settings.hiddenChannels, []);
  assert.deepEqual(settings.skipVisitedContexts, {});
  assert.equal(settings.lastModalTab, 'filter');
  settings.hiddenChannels.push('local');
  assert.deepEqual(config.settings().hiddenChannels, []);
  config.saveFilters({}, config.filters('session'));
  assert.equal(storage.getItem('arcaFeed:channelFilter:first'), null);
  assert.deepEqual(Object.keys(config.filters('session')), []);
});
