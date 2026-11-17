import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import {
  sourceLoader,
  memoryStorage,
  deferred,
  vaultFixture,
} from './source-loader.mjs';

function fixture(
  factory = new IDBFactory(),
  legacy = memoryStorage(),
  notify = () => {},
) {
  const failures = [];
  const { IndexedStorage } = sourceLoader({
    globals: { BroadcastChannel: undefined },
    mocks: {
      '@/utils/operation-error': {
        OperationError: Error,
        reportFailure: (error) => failures.push(error),
      },
    },
  })('src/vault/indexed-storage.ts');
  return {
    storage: new IndexedStorage(factory, legacy, notify),
    factory,
    legacy,
    failures,
  };
}

function abortWrites(database) {
  const original = database.transaction.bind(database);
  database.transaction = (...args) => {
    const transaction = original(...args);
    if (args[1] === 'readwrite') {
      const objectStore = transaction.objectStore.bind(transaction);
      transaction.objectStore = (name) => {
        const store = objectStore(name);
        store.put = () => {
          transaction.abort();
        };
        return store;
      };
    }
    return transaction;
  };
  return () => {
    database.transaction = original;
  };
}

test('imports all application keys once, preserving site data and committed IndexedDB values', async () => {
  const legacy = memoryStorage({
    'arcaFeed:displaySettings': '{"showVisitedIndicators":true}',
    'arcaFeed:readingList:old': '["/b/test/1"]',
    'arcaFeed:old:articleList': '["/b/test/2"]',
    arca_version_info: 'v1',
    recent_articles: '[{"id":1}]',
    unrelated: 'site',
  });
  const f = fixture(new IDBFactory(), legacy);
  await f.storage.initialize();
  assert.equal(f.storage.getItem('arca_version_info'), 'v1');
  assert.equal(f.storage.getItem('arcaFeed:readingList:old'), '["/b/test/1"]');
  assert.deepEqual([...legacy.values.keys()], ['recent_articles', 'unrelated']);
  f.storage.setItem('arca_version_info', 'v2');
  await f.storage.flush();
  legacy.setItem('arca_version_info', 'stale');
  const next = fixture(f.factory, legacy);
  await next.storage.initialize();
  assert.equal(next.storage.getItem('arca_version_info'), 'v2');
  assert.equal(legacy.getItem('arca_version_info'), null);
  legacy.setItem('recent_articles', 'updated by site');
  assert.equal(next.storage.getItem('recent_articles'), 'updated by site');
});

test('failed migration retains the original keys and retries on the next initialization', async () => {
  const factory = new IDBFactory();
  const original = factory.open.bind(factory);
  let restore;
  factory.open = (...args) => {
    const request = original(...args);
    request.addEventListener('success', () => {
      restore = abortWrites(request.result);
    });
    return request;
  };
  const legacy = memoryStorage({ 'arcaFeed:readingHistory': '{"version":2}' });
  const first = fixture(factory, legacy);
  await assert.rejects(first.storage.initialize());
  assert.equal(legacy.getItem('arcaFeed:readingHistory'), '{"version":2}');
  restore();
  factory.open = original;
  const next = fixture(factory, legacy);
  await next.storage.initialize();
  assert.equal(
    next.storage.getItem('arcaFeed:readingHistory'),
    '{"version":2}',
  );
  assert.equal(legacy.getItem('arcaFeed:readingHistory'), null);
});

test('commits queued writes and deletions together, retains failed writes for retry', async () => {
  const f = fixture();
  await f.storage.initialize();
  f.storage.setItem('arcaFeed:list', '[1]');
  f.storage.setItem('arcaFeed:position', '1');
  await f.storage.flush();
  const restore = abortWrites(f.storage.database);
  f.storage.setItem('arcaFeed:position', '2');
  await assert.rejects(f.storage.flush());
  const before = fixture(f.factory);
  await before.storage.initialize();
  assert.equal(before.storage.getItem('arcaFeed:position'), '1');
  restore();
  f.storage.removeItem('arcaFeed:list');
  await f.storage.flush();
  const after = fixture(f.factory);
  await after.storage.initialize();
  assert.equal(after.storage.getItem('arcaFeed:position'), '2');
  assert.equal(after.storage.getItem('arcaFeed:list'), null);
});

test('simultaneous imports preserve the first committed values', async () => {
  const factory = new IDBFactory();
  const first = fixture(
    factory,
    memoryStorage({ 'arcaFeed:setting': 'first' }),
  );
  const second = fixture(
    factory,
    memoryStorage({ 'arcaFeed:setting': 'second' }),
  );
  await Promise.all([first.storage.initialize(), second.storage.initialize()]);
  const check = fixture(factory);
  await check.storage.initialize();
  assert.equal(check.storage.getItem('arcaFeed:setting'), 'first');
});

test('broadcast refresh applies a complete snapshot before notifying readers', async () => {
  const channels = [];
  class Channel {
    constructor() {
      channels.push(this);
    }
    postMessage() {
      for (const other of channels) if (other !== this) other.onmessage?.();
    }
  }
  const { IndexedStorage } = sourceLoader({
    globals: { BroadcastChannel: Channel },
  })('src/vault/indexed-storage.ts');
  const factory = new IDBFactory();
  const changed = deferred();
  const writer = new IndexedStorage(factory, memoryStorage());
  const reader = new IndexedStorage(factory, memoryStorage(), (key) => {
    if (key !== 'arcaFeed:summary') return;
    assert.equal(reader.getItem('arcaFeed:list'), '[1,2]');
    changed.resolve();
  });
  await writer.initialize();
  await reader.initialize();
  writer.setItem('arcaFeed:summary', 'two');
  writer.setItem('arcaFeed:list', '[1,2]');
  await writer.flush();
  await changed.promise;
});

test('navigation waits for commit and rolls back after a rejected write', async () => {
  const commit = deferred();
  let calls = 0;
  const { navigate } = sourceLoader({
    mocks: {
      '@/vault/indexed-storage': {
        flushStorage: () =>
          ++calls === 1 ? commit.promise : Promise.resolve(),
      },
      '@/utils/operation-error': {
        OperationError: class extends Error {},
        reportFailure: (error) => error,
      },
    },
    globals: { window: {} },
  })('src/feature/navigation.ts');
  const p = vaultFixture({ activeIndex: 0 });
  let moved = false;
  const navigation = navigate(
    p,
    () => {
      moved = true;
    },
    { patch: { activeIndex: 1 } },
  );
  await Promise.resolve();
  assert.equal(moved, false);
  commit.reject(new Error('quota'));
  await assert.rejects(navigation);
  assert.equal(moved, false);
  assert.equal(p.activeIndex, 0);
  await navigate(
    p,
    () => {
      moved = true;
    },
    { patch: { activeIndex: 1 } },
  );
  assert.equal(moved, true);
});
