import assert from 'node:assert/strict';
import test from 'node:test';
import { memoryStorage, sourceLoader } from './source-loader.mjs';
function fixture() {
  const storage = memoryStorage();
  const reads = [];
  const get = storage.get.bind(storage);
  storage.get = (store, key) => {
    reads.push([store, key]);
    return get(store, key);
  };
  const load = sourceLoader();
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigStorage } = load('src/vault/config-storage.ts');
  return {
    storage,
    reads,
    config: new ConfigStorage(new StorageRepository(storage)),
    mergeState: load('src/vault/lazy-state.ts').mergeState,
  };
}
const filter = {
  title: ['keyword'],
  tab: [],
  disableSwiper: false,
  onlyBest: false,
};
test('channel lookup and enumeration use native records without a separate channel index', () => {
  const { storage, reads, config } = fixture();
  for (const id of ['first', 'second'])
    storage.set('channelFilters', id, { id, value: filter });
  reads.length = 0;
  const filters = config.filters('session');
  assert.deepEqual(reads, []);
  assert.deepEqual(filters.first, filter);
  assert.deepEqual(reads, [['channelFilters', 'first']]);
  reads.length = 0;
  assert.deepEqual(Object.keys(filters), ['first', 'second']);
  assert.deepEqual(reads, []);
  assert.equal(Object.hasOwn(filters, 'missing'), false);
});
test('changing one channel preserves lazy filters and writes only that record', () => {
  const { storage, reads, config, mergeState } = fixture();
  for (const id of ['first', 'second'])
    storage.set('channelFilters', id, { id, value: filter });
  const previous = config.filters('session'),
    next = mergeState(previous, { first: { ...filter, onlyBest: true } });
  storage.recordWrites.length = 0;
  config.saveFilters(next, previous);
  assert.deepEqual(
    storage.recordWrites.map(({ store, key }) => [store, key]),
    [['channelFilters', 'first']],
  );
  assert.ok(!reads.some(([, key]) => key === 'second'));
  config.saveFilters({ first: next.first }, next);
  assert.equal(storage.get('channelFilters', 'second'), undefined);
  assert.deepEqual(Object.keys(config.filters('session')), ['first']);
});
test('settings groups load independently and unrelated state copies do not run getters', () => {
  const { storage, reads, config, mergeState } = fixture();
  storage.set('settings', 'display', {
    id: 'display',
    value: { contentWidth: 800 },
  });
  storage.set('settings', 'reading', {
    id: 'reading',
    value: { skipVisitedContexts: { 'channel:first': true } },
  });
  const settings = config.settings();
  assert.deepEqual(reads, []);
  assert.equal(settings.contentWidth, 800);
  assert.deepEqual(reads, [['settings', 'display']]);
  const copy = mergeState(settings, { lastModalTab: 'history' });
  assert.equal(copy.contentWidth, 800);
  assert.equal(copy.skipVisitedContexts['channel:first'], true);
  assert.deepEqual(reads, [
    ['settings', 'display'],
    ['settings', 'reading'],
  ]);
});
test('saving the modal selection neither reads nor writes other settings groups', () => {
  const { storage, reads, config, mergeState } = fixture();
  const previous = config.settings();
  const next = mergeState(previous, { lastModalTab: 'history' });
  storage.recordWrites.length = 0;
  config.saveSettings(next, previous);
  assert.deepEqual(reads, []);
  assert.deepEqual(
    storage.recordWrites.map(({ store, key }) => [store, key]),
    [['settings', 'lastModalTab']],
  );
});
test('malformed native settings and filters normalize independently', () => {
  const { storage, config } = fixture();
  storage.set('settings', 'display', {
    id: 'display',
    value: { contentWidth: 'bad', hideBlur: false },
  });
  storage.set('channelFilters', 'first', {
    id: 'first',
    value: { onlyBest: 'bad', title: ['ok', 1] },
  });
  assert.equal(config.settings().contentWidth, 700);
  assert.equal(config.settings().hideBlur, false);
  assert.deepEqual(config.filters('session').first.title, ['ok']);
});
