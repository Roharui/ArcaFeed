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

function observeRequests(storage) {
  const calls = [];
  const original = storage.database.transaction.bind(storage.database);
  storage.database.transaction = (...args) => {
    calls.push({ method: 'transaction', mode: args[1] });
    const transaction = original(...args);
    const objectStore = transaction.objectStore.bind(transaction);
    transaction.objectStore = (name) => {
      const store = objectStore(name);
      for (const method of [
        'get',
        'getKey',
        'getAllKeys',
        'openCursor',
        'put',
      ]) {
        const invoke = store[method].bind(store);
        store[method] = (...parameters) => {
          calls.push({ method, key: parameters[0] });
          return invoke(...parameters);
        };
      }
      return store;
    };
    return transaction;
  };
  return calls;
}

test('overlapping flush calls share a drain and commit each write generation once', async () => {
  const { storage } = fixture();
  await storage.initialize();
  const calls = observeRequests(storage);
  storage.setItem('arcaFeed:a', '1');
  const first = storage.flush();
  assert.equal(storage.flush(), first);
  await Promise.resolve();
  storage.setItem('arcaFeed:b', '2');
  assert.equal(storage.flush(), first);
  await first;
  assert.equal(calls.filter((call) => call.mode === 'readwrite').length, 2);
  assert.equal(storage.pending.size, 0);
});

test('partial refresh reads changed keys once and protects queued local edits', async () => {
  const factory = new IDBFactory();
  const writer = fixture(factory).storage;
  const reader = fixture(factory).storage;
  await writer.initialize();
  writer.setItem('arcaFeed:unchanged', 'large');
  writer.setItem('arcaFeed:deleted', 'old');
  await writer.flush();
  await reader.initialize();
  reader.schedule = () => {};
  reader.setItem('arcaFeed:local', 'local');
  writer.setItem('arcaFeed:local', 'remote');
  writer.setItem('arcaFeed:changed', 'new');
  writer.removeItem('arcaFeed:deleted');
  await writer.flush();
  const calls = observeRequests(reader);
  await Promise.all([
    reader.refresh(['arcaFeed:changed', 'arcaFeed:local']),
    reader.refresh(['arcaFeed:deleted', 'arcaFeed:changed']),
  ]);
  assert.equal(reader.getItem('arcaFeed:changed'), 'new');
  assert.equal(reader.getItem('arcaFeed:deleted'), null);
  assert.equal(reader.getItem('arcaFeed:local'), 'local');
  assert.equal(calls.filter((call) => call.method === 'getAllKeys').length, 0);
  assert.equal(
    calls.filter(
      (call) => call.method === 'get' && call.key === 'arcaFeed:changed',
    ).length,
    1,
  );
  await reader.flush();
});

test('broadcasts carry changed keys and batch notifications see the complete cache', async () => {
  const channels = [];
  class Channel {
    constructor() {
      channels.push(this);
    }
    postMessage(data) {
      for (const other of channels)
        if (other !== this) other.onmessage?.({ data });
    }
  }
  const { IndexedStorage } = sourceLoader({
    globals: { BroadcastChannel: Channel },
  })('src/vault/indexed-storage.ts');
  const factory = new IDBFactory();
  const changed = deferred();
  const writer = new IndexedStorage(factory, memoryStorage());
  const reader = new IndexedStorage(
    factory,
    memoryStorage(),
    () => assert.fail('individual notification'),
    () => true,
    (keys) => {
      if (!keys.includes('arcaFeed:a')) return;
      assert.deepEqual(new Set(keys), new Set(['arcaFeed:a', 'arcaFeed:b']));
      assert.equal(reader.getItem('arcaFeed:b'), '2');
      changed.resolve();
    },
  );
  await writer.initialize();
  await reader.initialize();
  const calls = observeRequests(reader);
  writer.setItem('arcaFeed:a', '1');
  writer.setItem('arcaFeed:b', '2');
  await writer.flush();
  await changed.promise;
  assert.equal(
    calls.some((call) => call.method === 'getAllKeys'),
    false,
  );
});

test('selective hydration inventories archived lists without reading their payloads', async () => {
  const factory = new IDBFactory();
  const seed = fixture(factory).storage;
  await seed.initialize();
  seed.setItem('arcaFeed:current:articleList', '["/b/test/1"]');
  seed.setItem('arcaFeed:archive:articleList', '["/b/test/2"]');
  await seed.flush();
  const { IndexedStorage } = sourceLoader({
    globals: { BroadcastChannel: undefined },
  })('src/vault/indexed-storage.ts');
  const reader = new IndexedStorage(
    factory,
    memoryStorage(),
    () => {},
    (key) => key !== 'arcaFeed:archive:articleList',
  );
  await reader.initialize();
  const calls = observeRequests(reader);
  await reader.refresh();
  assert.equal(reader.getItem('arcaFeed:current:articleList'), '["/b/test/1"]');
  assert.equal(reader.values.has('arcaFeed:archive:articleList'), false);
  assert.equal(reader.keys().includes('arcaFeed:archive:articleList'), true);
  assert.equal(
    calls.some(
      (call) =>
        call.method === 'get' && call.key === 'arcaFeed:archive:articleList',
    ),
    false,
  );
  seed.removeItem('arcaFeed:archive:articleList');
  await seed.flush();
  await reader.refresh(['arcaFeed:archive:articleList']);
  assert.equal(reader.keys().includes('arcaFeed:archive:articleList'), false);
});

test('focus recovery skips unchanged snapshots and recovers missed foreign writes', async () => {
  const factory = new IDBFactory();
  const writer = fixture(factory).storage;
  await writer.initialize();
  writer.setItem('arcaFeed:a', '1');
  await writer.flush();
  const reader = fixture(factory).storage;
  await reader.initialize();
  const calls = observeRequests(reader);
  await Promise.all([reader.refreshIfChanged(), reader.refreshIfChanged()]);
  assert.equal(calls.filter((call) => call.method === 'getAllKeys').length, 0);
  writer.setItem('arcaFeed:a', '2');
  await writer.flush();
  // Even a subsequent local commit must not mask a missed foreign commit.
  reader.setItem('arcaFeed:b', 'local');
  await reader.flush();
  await reader.refreshIfChanged();
  assert.equal(reader.getItem('arcaFeed:a'), '2');
  assert.equal(calls.filter((call) => call.method === 'getAllKeys').length, 1);
  calls.length = 0;
  await reader.refreshIfChanged();
  assert.equal(calls.filter((call) => call.method === 'getAllKeys').length, 0);
});

const readingSession = (id, patch = {}) => ({
  id,
  label: id,
  path: '/b/test/100',
  searchQuery: '',
  articleList: ['/b/test/100'],
  isSeriesMode: true,
  isScrapMode: false,
  seriesChannels: [],
  scrollY: 100,
  updatedAt: 1,
  ...patch,
});

function reading(storage) {
  const load = sourceLoader({
    globals: { window: { location: { origin: 'https://arca.live' } } },
  });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ReadingHistory } = load('src/vault/reading-history.ts');
  return new ReadingHistory(new StorageRepository(storage));
}

test('stale tabs preserve independent reading sessions, positions and custom edits', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  const b = fixture(factory).storage;
  await a.initialize();
  await b.initialize();
  const first = reading(a);
  const second = reading(b);
  first.saveSession(readingSession('a'));
  await a.flush();
  second.saveSession(readingSession('b', { scrollY: 200, updatedAt: 2 }));
  await b.flush();
  await a.refresh();
  first.reload();
  first.updateSession('a', { customName: 'renamed', pinned: true });
  await a.flush();
  // B still has its previous snapshot, including the old name and pin.
  second.saveSession(readingSession('a', { scrollY: 300, updatedAt: 3 }));
  await b.flush();
  const check = fixture(factory).storage;
  await check.initialize();
  const sessions = reading(check).sessions;
  assert.deepEqual(
    new Set(sessions.map((session) => session.id)),
    new Set(['a', 'b']),
  );
  const saved = sessions.find((session) => session.id === 'a');
  assert.equal(saved.customName, 'renamed');
  assert.equal(saved.pinned, true);
  assert.equal(saved.scrollY, 300);
  assert.equal(sessions.find((session) => session.id === 'b').scrollY, 200);
});

test('a stale checkpoint does not resurrect a deleted session or its list', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  await a.initialize();
  const first = reading(a);
  first.saveSession(readingSession('a'));
  await a.flush();
  const b = fixture(factory).storage;
  await b.initialize();
  const second = reading(b);
  void second.sessions;
  first.removeSession('a');
  await a.flush();
  second.saveSession(
    readingSession('a', {
      articleList: ['/b/test/100', '/b/test/99'],
      scrollY: 300,
      updatedAt: 3,
    }),
  );
  await b.flush();
  const check = fixture(factory).storage;
  await check.initialize();
  assert.equal(reading(check).sessions.length, 0);
  assert.equal(check.getItem('arcaFeed:readingList:a'), null);
  assert.deepEqual(JSON.parse(check.getItem('arcaFeed:readingProgress')), []);
});

test('concurrent large sessions keep the combined link budget and current article', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  const b = fixture(factory).storage;
  await a.initialize();
  await b.initialize();
  const first = reading(a);
  const second = reading(b);
  const links = Array.from(
    { length: 2000 },
    (_, index) => `/b/test/${index + 1}`,
  );
  first.saveSession(readingSession('a', { articleList: links }));
  first.saveSession(readingSession('b', { articleList: links, updatedAt: 2 }));
  await a.flush();
  second.saveSession(readingSession('c', { articleList: links, updatedAt: 3 }));
  await b.flush();
  const check = fixture(factory).storage;
  await check.initialize();
  const sessions = reading(check).sessions;
  assert.equal(sessions.length, 3);
  let physicalLinks = 0;
  for (const session of sessions) {
    const list = JSON.parse(
      check.getItem(`arcaFeed:readingList:${session.id}`),
    );
    physicalLinks += list.length;
    assert.ok(list.includes(session.path));
  }
  assert.equal(physicalLinks, 5000);
});

test('deferred reading payloads hydrate only the selected or budget-trimmed sessions', async () => {
  const factory = new IDBFactory();
  const seed = fixture(factory).storage;
  await seed.initialize();
  const history = reading(seed);
  const links = Array.from(
    { length: 2000 },
    (_, index) => `/b/test/${index + 1}`,
  );
  history.saveSession(readingSession('a', { articleList: links }));
  history.saveSession(
    readingSession('b', { articleList: links, updatedAt: 2 }),
  );
  await seed.flush();
  const { IndexedStorage } = sourceLoader({
    globals: { BroadcastChannel: undefined },
  })('src/vault/indexed-storage.ts');
  const reader = new IndexedStorage(
    factory,
    memoryStorage(),
    () => {},
    (key) => !key.startsWith('arcaFeed:readingList:'),
  );
  await reader.initialize();
  const loaded = reading(reader);
  const a = loaded.sessions.find((session) => session.id === 'a');
  assert.equal(reader.values.has('arcaFeed:readingList:a'), false);
  assert.equal(reader.values.has('arcaFeed:readingList:b'), false);
  await loaded.prepareList('a');
  assert.equal(a.articleList.length, 2000);
  assert.equal(reader.values.has('arcaFeed:readingList:b'), false);
  assert.equal(loaded.prepareList('a'), undefined);
  const next = readingSession('c', { articleList: links, updatedAt: 3 });
  await loaded.prepareSession(next);
  loaded.saveSession(next);
  await reader.flush();
  assert.equal(reader.values.has('arcaFeed:readingList:b'), false);
  assert.equal(
    JSON.parse(reader.getItem('arcaFeed:readingList:a')).length,
    1000,
  );
  const check = fixture(factory).storage;
  await check.initialize();
  assert.equal(
    reading(check).sessions.reduce(
      (sum, session) => sum + session.articleList.length,
      0,
    ),
    5000,
  );
});

test('failed stale merges retry against the latest committed data', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  const b = fixture(factory).storage;
  await a.initialize();
  await b.initialize();
  const first = reading(a);
  const second = reading(b);
  first.saveSession(readingSession('a'));
  await a.flush();
  const restore = abortWrites(b.database);
  second.saveSession(readingSession('b', { updatedAt: 2 }));
  await assert.rejects(b.flush());
  first.saveSession(readingSession('c', { updatedAt: 3 }));
  await a.flush();
  restore();
  await b.flush();
  const check = fixture(factory).storage;
  await check.initialize();
  assert.deepEqual(
    new Set(reading(check).sessions.map((session) => session.id)),
    new Set(['a', 'b', 'c']),
  );
});

test('filter inventory merges additions and deletions without reviving stale channels', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  await a.initialize();
  a.setItem('arcaFeed:filterChannels', '["old"]');
  await a.flush();
  const b = fixture(factory).storage;
  await b.initialize();
  a.setItem('arcaFeed:filterChannels', '["a"]');
  await a.flush();
  b.setItem('arcaFeed:filterChannels', '["old","b"]');
  await b.flush();
  assert.deepEqual(
    new Set(JSON.parse(b.getItem('arcaFeed:filterChannels'))),
    new Set(['a', 'b']),
  );
});

test('edits queued during a rebasing commit preserve both newer local and foreign positions', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  await a.initialize();
  const key = 'arcaFeed:readingProgress';
  const position = (id, scrollY) => ({
    id,
    path: '/b/test/100',
    scrollY,
    updatedAt: scrollY,
  });
  a.setItem(key, JSON.stringify([position('b', 10)]));
  await a.flush();
  const b = fixture(factory).storage;
  await b.initialize();
  a.setItem(key, JSON.stringify([position('b', 10), position('c', 20)]));
  await a.flush();
  b.setItem(key, JSON.stringify([position('a', 100), position('b', 10)]));
  const flushing = b.flush();
  await Promise.resolve();
  b.setItem(key, JSON.stringify([position('a', 200), position('b', 10)]));
  await flushing;
  const positions = JSON.parse(b.getItem(key));
  assert.deepEqual(
    new Set(positions.map((item) => item.id)),
    new Set(['a', 'b', 'c']),
  );
  assert.equal(positions.find((item) => item.id === 'a').scrollY, 200);
});

test('stale insertion cannot evict twenty pinned sessions or leave an orphan list', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  const b = fixture(factory).storage;
  await a.initialize();
  await b.initialize();
  const first = reading(a);
  for (let index = 0; index < 20; index++) {
    first.saveSession(
      readingSession(`pin${index}`, { pinned: true, updatedAt: index + 1 }),
    );
  }
  await a.flush();
  reading(b).saveSession(readingSession('new', { updatedAt: 100 }));
  await b.flush();
  const check = fixture(factory).storage;
  await check.initialize();
  const sessions = reading(check).sessions;
  assert.equal(sessions.length, 20);
  assert.ok(sessions.every((session) => session.pinned));
  assert.equal(check.getItem('arcaFeed:readingList:new'), null);
});

test('automatic eviction respects a pin applied after the writer cached its sessions', async () => {
  const factory = new IDBFactory();
  const a = fixture(factory).storage;
  await a.initialize();
  const first = reading(a);
  for (let index = 0; index < 20; index++)
    first.saveSession(readingSession(`item${index}`, { updatedAt: index + 1 }));
  await a.flush();
  const b = fixture(factory).storage;
  await b.initialize();
  const second = reading(b);
  void second.sessions;
  first.updateSession('item0', { pinned: true });
  await a.flush();
  second.saveSession(readingSession('new', { updatedAt: 100 }));
  await b.flush();
  const check = fixture(factory).storage;
  await check.initialize();
  const sessions = reading(check).sessions;
  assert.equal(sessions.length, 20);
  assert.equal(sessions.find((session) => session.id === 'item0').pinned, true);
  assert.deepEqual(JSON.parse(check.getItem('arcaFeed:readingList:item0')), [
    '/b/test/100',
  ]);
  assert.ok(sessions.some((session) => session.id === 'new'));
});
