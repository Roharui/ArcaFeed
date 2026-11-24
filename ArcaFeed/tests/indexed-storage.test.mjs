import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { sourceLoader, deferred, vaultFixture } from './source-loader.mjs';
function legacyStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}
function fixture(
  factory = new IDBFactory(),
  legacy = legacyStorage(),
  notify = () => {},
  currentId = '',
  globals = {},
) {
  const failures = [];
  const { IndexedStorage } = sourceLoader({
    globals: { BroadcastChannel: undefined, ...globals },
    mocks: {
      '@/utils/operation-error': {
        OperationError: Error,
        reportFailure: (error) => failures.push(error),
      },
    },
  })('src/vault/indexed-storage.ts');
  return {
    storage: new IndexedStorage(factory, legacy, notify, currentId),
    factory,
    legacy,
    failures,
  };
}
async function seedLegacy(factory, values) {
  const db = await new Promise((resolve, reject) => {
    const request = factory.open('ArcaFeed', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('values');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('values', 'readwrite');
    for (const [key, value] of Object.entries(values))
      tx.objectStore('values').put(value, key);
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}
function observe(storage) {
  const calls = [];
  const original = storage.database.transaction.bind(storage.database);
  storage.database.transaction = (names, mode, ...rest) => {
    const tx = original(names, mode, ...rest);
    calls.push({
      method: 'transaction',
      names: [...(Array.isArray(names) ? names : [names])],
      mode,
    });
    const objectStore = tx.objectStore.bind(tx);
    const observed = new WeakSet();
    tx.objectStore = (name) => {
      const store = objectStore(name);
      if (observed.has(store)) return store;
      observed.add(store);
      for (const method of ['get', 'getAll', 'getAllKeys', 'put', 'delete']) {
        const invoke = store[method].bind(store);
        store[method] = (...args) => {
          calls.push({
            method,
            store: name,
            key: method === 'put' ? undefined : args[0],
            value: method === 'put' ? args[0] : undefined,
          });
          return invoke(...args);
        };
      }
      return store;
    };
    return tx;
  };
  return calls;
}
function abortWrites(storage) {
  const original = storage.database.transaction.bind(storage.database);
  storage.database.transaction = (...args) => {
    const tx = original(...args);
    if (args[1] === 'readwrite') tx.addEventListener('complete', () => {});
    if (args[1] === 'readwrite') {
      const get = tx.objectStore.bind(tx);
      tx.objectStore = (name) => {
        const store = get(name);
        store.put = () => {
          tx.abort();
        };
        return store;
      };
    }
    return tx;
  };
  return () => {
    storage.database.transaction = original;
  };
}
function reading(storage) {
  const load = sourceLoader({
    globals: { window: { location: { origin: 'https://arca.live' } } },
  });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ReadingHistory } = load('src/vault/reading-history.ts');
  return new ReadingHistory(new StorageRepository(storage));
}
const session = (id, patch = {}) => ({
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
async function reopen(f) {
  const next = fixture(f.factory);
  await next.storage.initialize();
  return next.storage;
}

test('first import stores native objects in separate stores, preserves site data and removes owned strings', async () => {
  const f = fixture(
    undefined,
    legacyStorage({
      'arcaFeed:displaySettings': '{"contentWidth":800}',
      'arcaFeed:channelFilter:test': '{"title":["x"]}',
      'arcaFeed:session:articleList': '["/b/test/100"]',
      'arcaFeed:session:lastActiveIndex': '0',
      recent_articles: 'site',
      unrelated: 'keep',
      arca_version_info: 'version',
    }),
    () => {},
    'session',
  );
  await f.storage.initialize();
  assert.equal(f.storage.get('settings', 'display').value.contentWidth, 800);
  assert.deepEqual(f.storage.get('channelFilters', 'test').value.title, ['x']);
  assert.deepEqual(f.storage.get('lists', ['navigation', 'session']).paths, [
    '/b/test/100',
  ]);
  assert.equal(
    f.storage.get('progress', ['navigation', 'session']).activeIndex,
    0,
  );
  assert.deepEqual(
    [...f.legacy.values.keys()],
    ['recent_articles', 'unrelated'],
  );
  assert.equal(f.storage.site('recent_articles'), 'site');
  assert.equal(f.storage.get('settings', 'versionInfo').value, 'version');
  assert.deepEqual(
    [...f.storage.database.objectStoreNames],
    [
      'channelFilters',
      'lists',
      'meta',
      'navigationSessions',
      'progress',
      'resumeSessions',
      'settings',
    ],
  );
});

test('v1 upgrade favors committed IndexedDB records and clears the obsolete values store atomically', async () => {
  const factory = new IDBFactory();
  await seedLegacy(factory, {
    __localStorageMigrated__: '1',
    'arcaFeed:displaySettings': '{"contentWidth":900}',
    'arcaFeed:recentArticleKeys': '["session"]',
    'arcaFeed:session:articleList': '["/b/test/100"]',
  });
  const f = fixture(
    factory,
    legacyStorage({ 'arcaFeed:displaySettings': '{"contentWidth":700}' }),
    () => {},
    'session',
  );
  await f.storage.initialize();
  assert.equal(f.storage.get('settings', 'display').value.contentWidth, 900);
  assert.equal(f.storage.database.objectStoreNames.contains('values'), false);
  assert.equal(f.storage.get('meta', 'schema').version, 2);
  const next = await reopen(f);
  assert.equal(next.get('settings', 'display').value.contentWidth, 900);
});

test('aborted schema migration preserves localStorage and v1 records for retry', async () => {
  const factory = new IDBFactory();
  await seedLegacy(factory, {
    'arcaFeed:displaySettings': '{"contentWidth":900}',
  });
  const original = factory.open.bind(factory);
  factory.open = (...args) => {
    const request = original(...args);
    request.addEventListener('upgradeneeded', () =>
      request.transaction.abort(),
    );
    return request;
  };
  const f = fixture(
    factory,
    legacyStorage({ 'arcaFeed:readingSettings': '{"skipVisitedContexts":{}}' }),
  );
  await assert.rejects(f.storage.initialize());
  assert.notEqual(f.legacy.getItem('arcaFeed:readingSettings'), null);
  factory.open = original;
  const next = fixture(factory, f.legacy);
  await next.storage.initialize();
  assert.equal(next.storage.get('settings', 'display').value.contentWidth, 900);
  assert.notEqual(next.storage.get('settings', 'reading'), undefined);
});

test('failed writes keep the whole batch retryable and never expose partial committed settings', async () => {
  const f = fixture();
  await f.storage.initialize();
  f.storage.set('settings', 'a', { id: 'a', value: 1 });
  await f.storage.flush();
  const restore = abortWrites(f.storage);
  f.storage.set('settings', 'a', { id: 'a', value: 2 });
  f.storage.set('settings', 'b', { id: 'b', value: 3 });
  await assert.rejects(f.storage.flush());
  const before = await reopen(f);
  assert.equal(before.get('settings', 'a').value, 1);
  assert.equal(before.get('settings', 'b'), undefined);
  restore();
  await f.storage.flush();
  const after = await reopen(f);
  assert.equal(after.get('settings', 'a').value, 2);
  assert.equal(after.get('settings', 'b').value, 3);
});

test('overlapping flushes share one drain and a subsequent edit is committed once', async () => {
  const f = fixture();
  await f.storage.initialize();
  const calls = observe(f.storage);
  f.storage.set('settings', 'a', { id: 'a', value: 1 });
  const first = f.storage.flush();
  assert.equal(f.storage.flush(), first);
  await Promise.resolve();
  f.storage.set('settings', 'b', { id: 'b', value: 2 });
  assert.equal(f.storage.flush(), first);
  await first;
  assert.equal(calls.filter((call) => call.mode === 'readwrite').length, 2);
  assert.equal(f.storage.pending.size, 0);
  assert.ok(
    calls
      .filter((call) => call.mode === 'readwrite')
      .every((call) => call.names.every((name) => name === 'settings')),
  );
});

test('metadata and lists have independent records and metadata-only edits never write lists', async () => {
  const f = fixture();
  await f.storage.initialize();
  const history = reading(f.storage);
  history.saveSession(session('a'));
  await f.storage.flush();
  const calls = observe(f.storage);
  history.updateSession('a', { customName: 'new', pinned: true });
  await f.storage.flush();
  assert.equal(f.storage.get('resumeSessions', 'a').customName, 'new');
  assert.ok(
    !calls.some(
      (call) =>
        call.method === 'put' &&
        (call.store === 'lists' || call.store === 'progress'),
    ),
  );
});

test('position updates write one small native record without reading lists or whole collections', async () => {
  const f = fixture();
  await f.storage.initialize();
  const history = reading(f.storage);
  history.saveSession(session('a'));
  await f.storage.flush();
  const calls = observe(f.storage);
  assert.equal(history.savePosition('a', '/b/test/100', 300, 3), true);
  await f.storage.flush();
  assert.deepEqual(
    calls.filter((call) => call.method === 'put').map((call) => call.store),
    ['progress'],
  );
  assert.ok(
    !calls.some(
      (call) =>
        call.method === 'getAll' ||
        call.store === 'lists' ||
        call.store === 'meta',
    ),
  );
  assert.equal(f.storage.get('progress', ['resume', 'a']).scrollY, 300);
});

test('budget commits reuse bulk reads and preserve cascade deletes', async () => {
  const { storage } = fixture();
  await storage.initialize();
  const calls = observe(storage);
  storage.delete('resumeSessions', 'missing');
  storage.delete('navigationSessions', 'missing');
  storage.delete('progress', ['resume', 'missing']);
  storage.delete('progress', ['navigation', 'missing']);
  await storage.flush();
  assert.deepEqual(
    calls.filter((call) => call.method === 'getAll').map((call) => call.store),
    ['resumeSessions', 'navigationSessions', 'progress'],
  );
  assert.deepEqual(
    calls.filter((call) => call.method === 'get'),
    [],
  );
  assert.deepEqual(
    calls
      .filter((call) => call.method === 'delete')
      .map(({ store, key }) => [store, key]),
    [
      ['lists', ['navigation', 'missing']],
      ['lists', ['resume', 'missing']],
    ],
  );
});

test('initial hydration and selecting one resume leave unrelated list payloads unread', async () => {
  const f = fixture();
  await f.storage.initialize();
  const history = reading(f.storage);
  history.saveSession(session('a'));
  history.saveSession(session('b', { updatedAt: 2 }));
  await f.storage.flush();
  const reader = await reopen(f);
  assert.equal(reader.get('lists', ['resume', 'a']), undefined);
  assert.equal(reader.get('lists', ['resume', 'b']), undefined);
  const calls = observe(reader);
  const saved = reading(reader);
  assert.equal(saved.sessions.length, 2);
  await saved.prepareList('a');
  assert.equal(
    saved.sessions.find((item) => item.id === 'a').articleList.length,
    1,
  );
  assert.equal(reader.get('lists', ['resume', 'b']), undefined);
  assert.equal(saved.prepareList('a'), undefined);
  assert.ok(
    !calls.some((call) => call.store === 'lists' && call.key?.[1] === 'b'),
  );
});

test('partial refresh merges addresses, applies a whole snapshot before notification, and protects queued edits', async () => {
  const f = fixture();
  await f.storage.initialize();
  const reader = await reopen(f);
  f.storage.set('settings', 'a', { id: 'a', value: 1 });
  f.storage.set('settings', 'b', { id: 'b', value: 2 });
  await f.storage.flush();
  const calls = observe(reader);
  await Promise.all([
    reader.refresh([{ store: 'settings', key: 'a' }]),
    reader.refresh([
      { store: 'settings', key: 'b' },
      { store: 'settings', key: 'a' },
    ]),
  ]);
  assert.equal(reader.get('settings', 'a').value, 1);
  assert.equal(reader.get('settings', 'b').value, 2);
  assert.equal(
    calls.filter((call) => call.method === 'get' && call.key === 'a').length,
    1,
  );
  assert.ok(
    calls
      .filter((call) => call.method === 'transaction')
      .every((call) => call.names.length === 1 && call.names[0] === 'settings'),
  );
  reader.schedule = () => {};
  reader.set('settings', 'a', { id: 'a', value: 3 });
  await reader.refresh([{ store: 'settings', key: 'a' }]);
  assert.equal(reader.get('settings', 'a').value, 3);
  await reader.flush();
});

test('broadcasts carry native addresses and expose all changes before notifying subscribers', async () => {
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
  const writer = new IndexedStorage(factory, legacyStorage());
  const reader = new IndexedStorage(factory, legacyStorage(), (changes) => {
    if (!changes.some((c) => c.store === 'settings' && c.key === 'a')) return;
    assert.equal(reader.get('settings', 'b').value, 2);
    changed.resolve();
  });
  await writer.initialize();
  await reader.initialize();
  writer.set('settings', 'a', { id: 'a', value: 1 });
  writer.set('settings', 'b', { id: 'b', value: 2 });
  await writer.flush();
  await changed.promise;
});

test('recovery refresh reads small metadata and only fetches loaded lists whose versions changed', async () => {
  const f = fixture();
  await f.storage.initialize();
  const writer = reading(f.storage);
  writer.saveSession(session('a'));
  writer.saveSession(session('b', { updatedAt: 2 }));
  await f.storage.flush();
  const reader = await reopen(f);
  await reading(reader).prepareList('a');
  const calls = observe(reader);
  await reader.refresh();
  assert.ok(!calls.some((call) => call.store === 'lists'));
  writer.saveSession(
    session('a', { articleList: ['/b/test/100', '/b/test/99'], updatedAt: 3 }),
  );
  await f.storage.flush();
  calls.length = 0;
  await reader.refresh();
  assert.deepEqual(reader.get('lists', ['resume', 'a']).paths, [
    '/b/test/100',
    '/b/test/99',
  ]);
  assert.equal(reader.get('lists', ['resume', 'b']), undefined);
  assert.ok(
    !calls.some((call) => call.store === 'lists' && call.key?.[1] === 'b'),
  );
});

test('stale tabs preserve independent sessions and positions without array rebasing', async () => {
  const f = fixture();
  await f.storage.initialize();
  const other = await reopen(f);
  const a = reading(f.storage),
    b = reading(other);
  a.saveSession(session('a'));
  await f.storage.flush();
  b.saveSession(session('b', { scrollY: 200, updatedAt: 2 }));
  await other.flush();
  const check = await reopen(f);
  assert.deepEqual(
    new Set(reading(check).sessions.map((row) => row.id)),
    new Set(['a', 'b']),
  );
  assert.equal(check.get('progress', ['resume', 'a']).scrollY, 100);
  assert.equal(check.get('progress', ['resume', 'b']).scrollY, 200);
});

test('stale automatic checkpoints preserve another tabs name and pin', async () => {
  const f = fixture();
  await f.storage.initialize();
  const a = reading(f.storage);
  a.saveSession(session('a'));
  await f.storage.flush();
  const other = await reopen(f);
  const b = reading(other);
  void b.sessions;
  a.updateSession('a', { customName: 'renamed', pinned: true });
  await f.storage.flush();
  await b.prepareList('a');
  b.saveSession(session('a', { scrollY: 300, updatedAt: 3 }));
  await other.flush();
  const check = await reopen(f);
  assert.equal(check.get('resumeSessions', 'a').customName, 'renamed');
  assert.equal(check.get('resumeSessions', 'a').pinned, true);
  assert.equal(check.get('progress', ['resume', 'a']).scrollY, 300);
});

test('deleting a session wins over a stale checkpoint and cascades to its list and position', async () => {
  const f = fixture();
  await f.storage.initialize();
  const a = reading(f.storage);
  a.saveSession(session('a'));
  await f.storage.flush();
  const other = await reopen(f);
  const b = reading(other);
  void b.sessions;
  await b.prepareList('a');
  a.removeSession('a');
  await f.storage.flush();
  b.saveSession(
    session('a', {
      articleList: ['/b/test/100', '/b/test/99'],
      scrollY: 300,
      updatedAt: 3,
    }),
  );
  await other.flush();
  const check = await reopen(f);
  assert.equal(check.get('resumeSessions', 'a'), undefined);
  assert.equal(check.get('progress', ['resume', 'a']), undefined);
  await check.prepare([{ store: 'lists', key: ['resume', 'a'] }]);
  assert.equal(check.get('lists', ['resume', 'a']), undefined);
});

test('a newer stored position wins over an older checkpoint timestamp', async () => {
  const f = fixture();
  await f.storage.initialize();
  const a = reading(f.storage);
  a.saveSession(session('a'));
  await f.storage.flush();
  const other = await reopen(f);
  const b = reading(other);
  await b.prepareList('a');
  b.saveSession(session('a'));
  a.savePosition('a', '/b/test/100', 900, 9);
  await f.storage.flush();
  b.savePosition('a', '/b/test/100', 200, 2);
  await other.flush();
  assert.equal((await reopen(f)).get('progress', ['resume', 'a']).scrollY, 900);
});

test('combined resume budgets trim only needed lists and retain every current article', async () => {
  const f = fixture();
  await f.storage.initialize();
  const other = await reopen(f);
  const a = reading(f.storage),
    b = reading(other);
  const paths = Array.from(
    { length: 2000 },
    (_, index) => `/b/test/${index + 1}`,
  );
  a.saveSession(session('a', { articleList: paths }));
  a.saveSession(session('b', { articleList: paths, updatedAt: 2 }));
  await f.storage.flush();
  const calls = observe(other);
  b.saveSession(session('c', { articleList: paths, updatedAt: 3 }));
  await other.flush();
  assert.deepEqual(
    calls.filter((call) => call.method === 'getAll').map((call) => call.store),
    ['resumeSessions', 'progress'],
  );
  assert.deepEqual(
    calls.filter((call) => call.method === 'get' && call.store !== 'lists'),
    [],
  );
  const check = await reopen(f);
  const rows = check.all('resumeSessions');
  assert.equal(rows.length, 3);
  await check.prepare(
    rows.map((row) => ({ store: 'lists', key: ['resume', row.id] })),
  );
  let total = 0;
  for (const row of rows) {
    const list = check.get('lists', ['resume', row.id]);
    total += list.paths.length;
    assert.ok(list.paths.includes(row.path));
  }
  assert.equal(total, 5000);
});

test('automatic eviction respects a newly pinned session from another tab', async () => {
  const f = fixture();
  await f.storage.initialize();
  const a = reading(f.storage);
  for (let index = 0; index < 20; index++)
    a.saveSession(session(`s${index}`, { updatedAt: index + 1 }));
  await f.storage.flush();
  const other = await reopen(f);
  const b = reading(other);
  void b.sessions;
  a.updateSession('s0', { pinned: true });
  await f.storage.flush();
  b.saveSession(session('new', { updatedAt: 100 }));
  await other.flush();
  const check = await reopen(f);
  assert.equal(check.all('resumeSessions').length, 20);
  assert.equal(check.get('resumeSessions', 's0')?.pinned, true);
  assert.ok(check.get('resumeSessions', 'new'));
});

test('twenty pinned sessions reject a stale insertion without orphan list data', async () => {
  const f = fixture();
  await f.storage.initialize();
  const other = await reopen(f);
  const a = reading(f.storage);
  for (let index = 0; index < 20; index++)
    a.saveSession(session(`s${index}`, { pinned: true, updatedAt: index + 1 }));
  await f.storage.flush();
  reading(other).saveSession(session('new', { updatedAt: 100 }));
  await other.flush();
  const check = await reopen(f);
  assert.equal(check.all('resumeSessions').length, 20);
  assert.equal(check.get('resumeSessions', 'new'), undefined);
  await check.prepare([{ store: 'lists', key: ['resume', 'new'] }]);
  assert.equal(check.get('lists', ['resume', 'new']), undefined);
});

test('context identity uses the canonical full query and reuses migrated identities', async () => {
  const f = fixture(
    undefined,
    legacyStorage({
      'arcaFeed:readingHistory': JSON.stringify({
        sessions: [
          session('old', {
            isSeriesMode: false,
            searchQuery: '?q=hello&mode=best&articleKey=old',
          }),
        ],
      }),
    }),
  );
  await f.storage.initialize();
  const history = reading(f.storage);
  assert.equal(
    history.getContextId(
      'channel',
      'test',
      'unused',
      '?mode=best&q=hello&articleKey=new',
    ),
    'old',
  );
  assert.notEqual(
    history.getContextId('channel', 'test', '', '?q=different'),
    'old',
  );
  assert.notEqual(
    history.getContextId('channel', 'test', '', '?q=a'),
    history.getContextId('channel', 'test', '', '?q=b'),
  );
});

test('navigation waits for the native commit and recovers after rejection', async () => {
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

test('overlapping list preparations both wait for hydration before using a saved list', async () => {
  const f = fixture();
  await f.storage.initialize();
  reading(f.storage).saveSession(
    session('a', { articleList: ['/b/test/100', '/b/test/99'] }),
  );
  await f.storage.flush();
  const reader = await reopen(f);
  const history = reading(reader);
  void history.sessions;
  const first = history.prepareList('a');
  const second = history.prepareList('a');
  assert.ok(first instanceof Promise);
  assert.equal(second, first);
  assert.equal(reader.get('lists', ['resume', 'a']), undefined);
  await Promise.all([first, second]);
  assert.equal(history.sessions[0].articleList.length, 2);
  assert.equal(history.prepareList('a'), undefined);
});

test('list preparation refreshes its metadata in the same snapshot', async () => {
  const f = fixture();
  await f.storage.initialize();
  const writer = reading(f.storage);
  writer.saveSession(session('a'));
  await f.storage.flush();
  const reader = await reopen(f);
  const history = reading(reader);
  void history.sessions;
  writer.saveSession(
    session('a', {
      path: '/b/test/99',
      articleList: ['/b/test/99', '/b/test/98'],
      updatedAt: 2,
    }),
  );
  await f.storage.flush();
  await history.prepareList('a');
  history.reload(['sessions', 'progress']);
  assert.equal(history.sessions[0].path, '/b/test/99');
  assert.deepEqual(history.sessions[0].articleList, [
    '/b/test/99',
    '/b/test/98',
  ]);
});

test('failed stale record updates retry against the latest committed records', async () => {
  const f = fixture();
  await f.storage.initialize();
  const other = await reopen(f);
  const a = reading(f.storage),
    b = reading(other);
  a.saveSession(session('a'));
  await f.storage.flush();
  const restore = abortWrites(other);
  b.saveSession(session('b', { updatedAt: 2 }));
  await assert.rejects(other.flush());
  a.saveSession(session('c', { updatedAt: 3 }));
  await f.storage.flush();
  restore();
  await other.flush();
  const check = await reopen(f);
  assert.deepEqual(
    new Set(check.all('resumeSessions').map((row) => row.id)),
    new Set(['a', 'b', 'c']),
  );
});

test('a new checkpoint requires no asynchronous read of a nonexistent resume list', async () => {
  const f = fixture();
  await f.storage.initialize();
  const history = reading(f.storage);
  assert.equal(history.prepareSession(session('new')), undefined);
  history.saveSession(session('new'));
  await f.storage.flush();
  assert.ok(f.storage.get('resumeSessions', 'new'));
});

test('reload-time budgeting follows recent progress rather than primary-key ordering', async () => {
  const f = fixture();
  await f.storage.initialize();
  const writer = reading(f.storage);
  const paths = Array.from(
    { length: 2000 },
    (_, index) => `/b/test/${index + 1}`,
  );
  writer.saveSession(session('aOlder', { articleList: paths, updatedAt: 2 }));
  writer.saveSession(session('zRecent', { articleList: paths, updatedAt: 1 }));
  await f.storage.flush();
  writer.saveSession(
    session('zRecent', { articleList: paths, scrollY: 300, updatedAt: 8 }),
  );
  await f.storage.flush();
  const reader = await reopen(f);
  const history = reading(reader);
  const next = session('new', { articleList: paths, updatedAt: 9 });
  await history.prepareSession(next);
  assert.ok(reader.get('lists', ['resume', 'aOlder']));
  assert.equal(reader.get('lists', ['resume', 'zRecent']), undefined);
  history.saveSession(next);
  await reader.flush();
  const check = await reopen(f);
  assert.equal(check.get('resumeSessions', 'zRecent').articleCount, 2000);
  assert.equal(check.get('resumeSessions', 'aOlder').articleCount, 1000);
});

function mobileActivity() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, handler) => documentListeners.set(name, handler),
  };
  return {
    globals: {
      document,
      window: {
        addEventListener: (name, handler) => windowListeners.set(name, handler),
      },
    },
    hide() {
      document.visibilityState = 'hidden';
      documentListeners.get('visibilitychange')();
    },
    show() {
      document.visibilityState = 'visible';
      documentListeners.get('visibilitychange')();
    },
    pagehide: () => windowListeners.get('pagehide')(),
    pageshow: () => windowListeners.get('pageshow')(),
  };
}

for (const mode of ['readonly', 'readwrite']) {
  test(
    `mobile suspension releases ${mode} locks and retries without losing edits`,
    { timeout: 5000 },
    async () => {
      const activity = mobileActivity();
      const f = fixture(
        new IDBFactory(),
        legacyStorage(),
        () => {},
        '',
        activity.globals,
      );
      await f.storage.initialize();
      f.storage.set('settings', 'a', { id: 'a', local: 0, remote: 0 });
      await f.storage.flush();
      const other = await reopen(f);
      const original = f.storage.database.transaction.bind(f.storage.database);
      const suspended = deferred();
      let interrupted = false;
      f.storage.database.transaction = (...args) => {
        const tx = original(...args);
        if (!interrupted && args[1] === mode) {
          interrupted = true;
          queueMicrotask(() => {
            activity.hide();
            suspended.resolve();
          });
        }
        return tx;
      };
      let settled = false;
      let operation;
      if (mode === 'readonly') {
        operation = f.storage.refresh([{ store: 'settings', key: 'a' }]);
      } else {
        f.storage.set('settings', 'a', { id: 'a', local: 1, remote: 0 });
        operation = f.storage.flush();
      }
      void operation.then(() => {
        settled = true;
      });
      await suspended.promise;
      other.set('settings', 'a', { id: 'a', local: 0, remote: 2 });
      await other.flush(); // A suspended tab must not block another tab's writes.
      assert.equal(settled, false);
      assert.equal(other.get('settings', 'a').remote, 2);
      activity.show();
      await operation;
      assert.equal(f.storage.get('settings', 'a').remote, 2);
      assert.equal(
        f.storage.get('settings', 'a').local,
        mode === 'readwrite' ? 1 : 0,
      );
      assert.deepEqual(f.failures, []);
      await other.refresh();
      assert.equal(
        other.get('settings', 'a').local,
        mode === 'readwrite' ? 1 : 0,
      );
    },
  );
}

test(
  'hidden and page-hidden mobile tabs defer new reads and writes until restored',
  { timeout: 5000 },
  async () => {
    const activity = mobileActivity();
    const f = fixture(
      new IDBFactory(),
      legacyStorage(),
      () => {},
      '',
      activity.globals,
    );
    await f.storage.initialize();
    const calls = observe(f.storage);
    let value = 0;
    for (const [hide, show] of [
      [activity.hide, activity.show],
      [activity.pagehide, activity.pageshow],
    ]) {
      calls.length = 0;
      hide();
      const refresh = f.storage.refresh([{ store: 'settings', key: 'a' }]);
      f.storage.set('settings', 'a', { id: 'a', value: ++value });
      const flush = f.storage.flush();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls.length, 0);
      show();
      await Promise.all([refresh, flush]);
      assert.ok(calls.some((call) => call.mode === 'readwrite'));
    }
  },
);
