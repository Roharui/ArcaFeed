import assert from 'node:assert/strict';
import test from 'node:test';
import { domFixture, listingFixture } from './dom-fixture.mjs';
import {
  deferred,
  memoryStorage,
  sourceLoader,
  vaultFixture,
} from './source-loader.mjs';

const quietConsole = { ...console, log() {} };
const toastMock = { default: () => ({ showToast() {}, hideToast() {} }) };
const windowFixture = {
  location: {
    href: 'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=session',
    origin: 'https://bbs.ruliweb.com',
  },
  history: { replaceState() {} },
};

test('native article paths avoid per-link URL parsing and preserve input rules', () => {
  let urls = 0;
  class CountedURL extends URL {
    constructor(...args) {
      super(...args);
      urls++;
    }
  }
  const { normalizeArticles } = sourceLoader({
    globals: { URL: CountedURL },
  })('src/vault/config-schema.ts');
  const paths = Array.from(
    { length: 20000 },
    (_, i) => `/community/board/300143/read/${i + 1}`,
  );
  assert.deepEqual(normalizeArticles(paths, 'https://bbs.ruliweb.com'), paths);
  assert.equal(urls, 1);
  const input = [
    '/community/board/300143/read/1',
    '/community/board/300143/read/1/',
    'https://bbs.ruliweb.com/community/board/300143/read/2?q=hello#title',
    '//bbs.ruliweb.com/community/board/300143/read/3',
    '/community/board/300143/read/4?query=1',
    '/community/board/300143/read/5#title',
    ' /community/board/300143/read/6\n',
    '/community/board/300143/read/7\n',
    '/community/board/300143/read/8\u2028',
    '/community/board/300143/../other/9',
    'https://other.example/community/board/300143/read/10',
    '//other.example/community/board/300143/read/11',
    '/b/invalid-channel/12',
    '/community/board/300143/no-article',
    '/community/board/300143/read/13/extra',
    'http://[invalid',
    null,
    123,
  ];
  const reference = (value, origin) => [
    ...new Set(
      value.flatMap((href) => {
        if (typeof href !== 'string') return [];
        try {
          const url = new URL(href, origin);
          return url.origin === new URL(origin).origin &&
            /^\/(?:[a-z0-9_-]+\/)*board\/\d+\/read\/\d+\/?$/i.test(url.pathname)
            ? [url.pathname.replace(/\/$/, '')]
            : [];
        } catch {
          return [];
        }
      }),
    ),
  ];
  for (const origin of [
    'https://bbs.ruliweb.com',
    'https://bbs.ruliweb.com/',
    'invalid',
  ])
    assert.deepEqual(
      normalizeArticles(input, origin),
      reference(input, origin),
    );
  assert.deepEqual(normalizeArticles(null, 'https://bbs.ruliweb.com'), []);
});

test('article lookup validates saved indices and caches searches per list', () => {
  const { findArticleIndex } = sourceLoader()('src/vault/article-window.ts');
  const articles = [
    '/community/board/300143/read/102',
    '/community/board/300143/read/101',
    '/community/board/300143/read/100',
  ];
  let scans = 0;
  articles.indexOf = function (path) {
    scans++;
    return Array.prototype.indexOf.call(this, path);
  };
  assert.equal(
    findArticleIndex(articles, '/community/board/300143/read/100', 2),
    2,
  );
  assert.equal(scans, 0);
  assert.equal(
    findArticleIndex(articles, '/community/board/300143/read/100'),
    2,
  );
  assert.equal(scans, 0);
  assert.equal(
    findArticleIndex(articles, '/community/board/300143/read/101', 0),
    1,
  );
  assert.equal(
    findArticleIndex(articles, '/community/board/300143/read/101'),
    1,
  );
  assert.equal(scans, 1);
  assert.equal(
    findArticleIndex(articles, '/community/board/300143/read/99'),
    -1,
  );
  assert.equal(
    findArticleIndex(articles, '/community/board/300143/read/99'),
    -1,
  );
  assert.equal(scans, 2);
  assert.equal(
    findArticleIndex(
      ['/community/board/300143/read/101'],
      '/community/board/300143/read/101',
    ),
    0,
  );
});

test('navigation compaction retains recent history and every queued article', () => {
  const { compactNavigationArticles } = sourceLoader()(
    'src/vault/article-window.ts',
  );
  const articles = Array.from(
    { length: 10000 },
    (_, i) => `/community/board/300143/read/${i + 1}`,
  );
  assert.equal(compactNavigationArticles(articles, articles[200]), articles);
  assert.equal(
    compactNavigationArticles(articles, '/community/board/300149/read/1'),
    articles,
  );
  const compacted = compactNavigationArticles(articles, articles[9000], 9000);
  assert.equal(compacted.length, 1100);
  assert.equal(compacted[100], articles[9000]);
  assert.deepEqual(compacted.slice(101), articles.slice(9001));
});

test('loading a long session compacts and persists its remapped navigation index', () => {
  const articles = Array.from(
    { length: 1000 },
    (_, i) => `/community/board/300143/read/${1000 - i}`,
  );
  const storage = memoryStorage({
    'ruliFeed:session:articleList': JSON.stringify(articles),
    'ruliFeed:session:lastActiveIndex': '900',
  });
  const load = sourceLoader({ globals: { window: windowFixture } });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const { createInitialState } = load('src/vault/store.ts');
  const config = new ConfigService(new StorageRepository(storage));
  const patch = config.loadConfig();
  assert.equal(patch.articleList.length, 200);
  assert.equal(patch.articleList[100], '/community/board/300143/read/100');
  assert.equal(patch.lastActiveIndex, 100);
  config.saveConfig({ ...createInitialState(), ...patch, activeIndex: 100 });
  assert.equal(
    JSON.parse(storage.getItem('ruliFeed:session:articleList')).length,
    200,
  );
  assert.equal(storage.getItem('ruliFeed:session:lastActiveIndex'), '100');
});

for (const isScrapMode of [false, true]) {
  test(`a new 300-link ${isScrapMode ? 'scrap' : 'series'} session retains all links on reload and activation`, async () => {
    const articles = Array.from(
      { length: 300 },
      (_, i) => `/community/board/300143/read/${i + 1}`,
    );
    const storage = memoryStorage();
    const load = sourceLoader({
      globals: {
        window: {
          ...windowFixture,
          location: {
            ...windowFixture.location,
            href: 'https://bbs.ruliweb.com/community/board/300143/read/250?articleKey=session',
          },
        },
      },
    });
    const { StorageRepository } = load('src/vault/repository.ts');
    const { ConfigService } = load('src/vault/config.ts');
    const config = new ConfigService(new StorageRepository(storage));
    config.copySeriesStorage('source', 'session', articles, 249, '');
    if (isScrapMode) storage.setItem('ruliFeed:session:scrapMode', 'true');
    const patch = config.loadConfig();
    assert.deepEqual(patch.articleList, articles);
    assert.equal(patch.lastActiveIndex, 249);
    const p = vaultFixture(patch);
    const { activateArticleLink } = loadLink({
      fetchFirstBatch: async () => assert.fail('unexpected refill'),
    });
    await activateArticleLink(p, '250');
    assert.deepEqual(p.articleList, articles);
    assert.equal(p.activeIndex, 249);
    config.saveConfig(p);
    assert.deepEqual(
      JSON.parse(storage.getItem('ruliFeed:session:articleList')),
      articles,
    );
  });
}

test('compaction preserves exhausted channel cursors and shuffled ordering', () => {
  const { compactNavigationArticles } = sourceLoader()(
    'src/vault/article-window.ts',
  );
  const articles = [
    '/community/board/300149/read/50',
    '/community/board/300149/read/10',
    ...Array.from(
      { length: 500 },
      (_, i) => `/community/board/300143/read/${1000 - i}`,
    ),
  ];
  const compacted = compactNavigationArticles(articles, articles[400], 400, [
    'community/board/300143',
    'community/board/300149',
  ]);
  assert.equal(compacted[0], '/community/board/300149/read/10');
  assert.equal(compacted[101], articles[400]);
  assert.deepEqual(compacted.slice(102), articles.slice(401));
  const shuffled = [...articles].reverse();
  const result = compactNavigationArticles(shuffled, shuffled[400], 400, [
    'community/board/300143',
    'community/board/300149',
  ]);
  assert.ok(result.includes('/community/board/300143/read/501'));
  assert.deepEqual(
    result.slice(result.indexOf(shuffled[400]) + 1),
    shuffled.slice(401),
  );
});

test('refill checks stop after three available articles instead of scanning the tail', async () => {
  let visits = 0;
  const p = vaultFixture({
    articleList: [
      '/community/board/300143/read/100',
      ...Array.from(
        { length: 10000 },
        (_, i) => `/community/board/300143/read/${i + 101}`,
      ),
    ],
  });
  p.skipVisitedArticles = true;
  p.reading.hasVisited = () => {
    visits++;
    return false;
  };
  const { activateArticleLink } = loadLink({
    fetchFirstBatch: async () => assert.fail('unexpected refill'),
  });
  await activateArticleLink(p, '100');
  assert.equal(visits, 3);
});

function loadLink(fetches, rows = [], onFilter = () => {}) {
  return sourceLoader({
    globals: { console: quietConsole },
    mocks: {
      './fetch': fetches,
      '@/feature/article/fetch': fetches,
      '@/feature/filter': {
        filterLink: (p, applyCss) => {
          onFilter(p, applyCss);
          return rows;
        },
      },
      '@/feature/search': { parseSearchQuery: (p) => p },
      'toastify-js': toastMock,
    },
  })('src/feature/article/link.ts');
}

test('state updates with unchanged values do not notify subscribers', () => {
  const { Store } = sourceLoader()('src/vault/store.ts');
  const store = new Store();
  let notifications = 0;
  store.subscribe(() => notifications++);
  store.setState({
    activeIndex: -1,
    articleList: store.getState().articleList,
  });
  assert.equal(notifications, 0);
  store.setState({ activeIndex: 0 });
  assert.equal(notifications, 1);
});

test('default channel settings arrays are isolated between stores', () => {
  const { Store } = sourceLoader()('src/vault/store.ts');
  const first = new Store();
  const second = new Store();
  first.getState().uiSettings.homeSeriesChannels.push('community/board/300143');
  assert.deepEqual(second.getState().uiSettings.homeSeriesChannels, []);
});

test('saving an unchanged state makes no storage writes; navigation saves only the index', () => {
  const load = sourceLoader({ mocks: { 'toastify-js': toastMock } });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const { createInitialState } = load('src/vault/store.ts');
  const storage = memoryStorage();
  const config = new ConfigService(new StorageRepository(storage));
  const state = {
    ...createInitialState(),
    articleKey: 'session',
    articleList: ['/community/board/300143/read/100'],
    activeIndex: 0,
  };
  config.saveConfig(state);
  storage.writes.length = 0;
  config.saveConfig(state);
  assert.equal(storage.writes.length, 0);
  config.saveConfig({ ...state, activeIndex: 1 });
  assert.deepEqual(storage.writes, [
    { key: 'ruliFeed:session:lastActiveIndex', value: '1' },
  ]);
  storage.writes.length = 0;
  config.saveConfig({
    ...state,
    activeIndex: 1,
    articleList: [...state.articleList, '/community/board/300143/read/99'],
  });
  assert.deepEqual(
    storage.writes.map((entry) => entry.key),
    ['ruliFeed:session:articleList'],
  );
});

test('switching session persists its complete scoped state', () => {
  const load = sourceLoader({ mocks: { 'toastify-js': toastMock } });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const { createInitialState } = load('src/vault/store.ts');
  const storage = memoryStorage();
  const config = new ConfigService(new StorageRepository(storage));
  const state = { ...createInitialState(), articleKey: 'first' };
  config.saveConfig(state);
  storage.writes.length = 0;
  config.saveConfig({ ...state, articleKey: 'second' });
  assert.equal(storage.getItem('ruliFeed:second:articleList'), '[]');
  assert.equal(storage.getItem('ruliFeed:second:seriesMode'), 'false');
  assert.equal(storage.getItem('ruliFeed:second:searchQuery'), '');
  assert.equal(storage.getItem('ruliFeed:second:lastActiveIndex'), '-1');
  assert.ok(
    storage.writes.every((entry) => entry.key !== 'ruliFeed:uiSettings'),
  );
});

test('page reload does not rewrite the loaded navigation list or settings', () => {
  const storage = memoryStorage();
  const load = sourceLoader({
    globals: { window: windowFixture },
    mocks: { 'toastify-js': toastMock },
  });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const { Store, createInitialState } = load('src/vault/store.ts');
  new ConfigService(new StorageRepository(storage)).saveConfig({
    ...createInitialState(),
    articleKey: 'session',
    activeIndex: 0,
    articleList: [
      '/community/board/300143/read/100',
      '/community/board/300143/read/99',
    ],
  });
  const config = new ConfigService(new StorageRepository(storage));
  const store = new Store(config.loadConfig());
  storage.writes.length = 0;
  store.setState({ activeIndex: 0 });
  config.saveConfig(store.getState());
  assert.equal(storage.writes.length, 0);
});

test('navigation pruning removes only expired native sessions and their dependent records', () => {
  const { StorageRepository } = sourceLoader()('src/vault/repository.ts');
  const storage = memoryStorage();
  for (let index = 0; index < 6; index++) {
    const id = String(index);
    storage.set('navigationSessions', id, { id, lastUsedAt: index });
    storage.set('lists', ['navigation', id], {
      kind: 'navigation',
      id,
      paths: [],
    });
    storage.set('progress', ['navigation', id], {
      kind: 'navigation',
      id,
      activeIndex: 0,
    });
  }
  storage.set('settings', 'display', {
    id: 'display',
    value: { contentWidth: 800 },
  });
  new StorageRepository(storage).pruneArticleKeyCaches('5');
  assert.equal(storage.all('navigationSessions').length, 5);
  assert.equal(storage.get('lists', ['navigation', '0']), undefined);
  assert.equal(storage.get('progress', ['navigation', '0']), undefined);
  assert.equal(storage.get('settings', 'display').value.contentWidth, 800);
});

test('pages without a session save global settings without creating an empty session cache', () => {
  const load = sourceLoader({ mocks: { 'toastify-js': toastMock } });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const { createInitialState } = load('src/vault/store.ts');
  const storage = memoryStorage();
  new ConfigService(new StorageRepository(storage)).saveConfig(
    createInitialState(),
  );
  assert.deepEqual(
    storage.writes.map(({ key }) => key).sort(),
    [
      'ruliFeed:displaySettings',
      'ruliFeed:subscriptionSettings',
      'ruliFeed:readingSettings',
      'ruliFeed:lastModalTab',
      'ruliFeed:isShuffleMode',
    ].sort(),
  );
  assert.ok(
    storage.writes.every((entry) => !entry.key.startsWith('ruliFeed::')),
  );
});

test('navigation retention derives from records instead of a redundant recency array', () => {
  const { StorageRepository } = sourceLoader()('src/vault/repository.ts');
  const storage = memoryStorage();
  for (let index = 0; index < 5; index++) {
    const id = String(index);
    storage.set('navigationSessions', id, { id, lastUsedAt: index });
  }
  const repo = new StorageRepository(storage);
  storage.recordWrites.length = 0;
  repo.pruneArticleKeyCaches('4');
  assert.equal(storage.recordWrites.length, 0);
  storage.set('navigationSessions', 'new', { id: 'new', lastUsedAt: 10 });
  repo.pruneArticleKeyCaches('new');
  assert.equal(storage.all('navigationSessions').length, 5);
  assert.equal(storage.get('navigationSessions', '0'), undefined);
});

test('concurrent mapping caps active requests and preserves channel order', async () => {
  const { mapConcurrent } = sourceLoader()('src/utils/func.ts');
  const gates = Array.from({ length: 8 }, deferred);
  let active = 0;
  let peak = 0;
  const started = [];
  const work = mapConcurrent(gates, async (gate, index) => {
    started.push(index);
    peak = Math.max(peak, ++active);
    await gate.promise;
    active--;
    return index;
  });
  assert.deepEqual(started, [0, 1, 2, 3]);
  for (const index of [3, 2, 1, 0, 7, 6, 5, 4]) {
    gates[index].resolve();
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.deepEqual(await work, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(peak, 4);
  assert.deepEqual(await mapConcurrent([], async () => assert.fail()), []);
  await assert.rejects(
    mapConcurrent([1], async () => 1, 0),
    RangeError,
  );
});

test('a channel failure rejects the batch and stops queuing more requests', async () => {
  const { mapConcurrent } = sourceLoader()('src/utils/func.ts');
  const started = [];
  await assert.rejects(
    mapConcurrent(
      [0, 1, 2, 3, 4],
      async (index) => {
        started.push(index);
        throw new Error('offline');
      },
      2,
    ),
    /offline/,
  );
  assert.deepEqual(started, [0, 1]);
});

test('identical simultaneous GET requests share a response and subsequent calls stay fresh', async () => {
  const response = deferred();
  let calls = 0;
  const { fetchUrl } = sourceLoader({
    globals: {
      window: windowFixture,
      fetch: () => {
        calls++;
        return response.promise;
      },
    },
  })('src/utils/fetch.ts');
  const first = fetchUrl('/community/board/300143');
  const second = fetchUrl('https://bbs.ruliweb.com/community/board/300143');
  assert.equal(first, second);
  assert.equal(calls, 1);
  response.resolve({ ok: true, text: async () => 'html' });
  assert.deepEqual(await first, { responseText: 'html' });
  await fetchUrl('/community/board/300143');
  assert.equal(calls, 2);
});

test('HTTP failures are surfaced and are not cached', async () => {
  let calls = 0;
  const { fetchUrl } = sourceLoader({
    globals: {
      window: windowFixture,
      fetch: async () => {
        calls++;
        return { ok: false, status: 503, text: () => assert.fail() };
      },
    },
  })('src/utils/fetch.ts');
  await assert.rejects(fetchUrl('/community/board/300143'), /HTTP 503/);
  await assert.rejects(fetchUrl('/community/board/300143'), /HTTP 503/);
  assert.equal(calls, 2);
});

test('write requests and GET requests with different timeouts are not coalesced', async () => {
  let calls = 0;
  const { fetchUrl } = sourceLoader({
    globals: {
      window: windowFixture,
      fetch: async () => {
        calls++;
        return { ok: true, text: async () => '' };
      },
    },
  })('src/utils/fetch.ts');
  await Promise.all([
    fetchUrl('/community/board/300143', 'GET', 100),
    fetchUrl('/community/board/300143', 'GET', 200),
    fetchUrl('/community/board/300143', 'POST'),
    fetchUrl('/community/board/300143', 'POST'),
  ]);
  assert.equal(calls, 4);
});

test('title-only filters work without selecting tabs and read the title once', () => {
  const { buildFilterPredicate } = sourceLoader()('src/feature/filter.ts');
  let titleReads = 0;
  const row = {
    get textContent() {
      titleReads++;
      return 'a normal title';
    },
  };
  const predicate = buildFilterPredicate({
    tab: [],
    title: Array.from({ length: 100 }, (_, index) => `blocked-${index}`),
  });
  assert.equal(predicate(row), true);
  assert.equal(titleReads, 1);
  assert.equal(
    buildFilterPredicate({ tab: [], title: ['normal'] })(row),
    false,
  );
  const hybrid = { matches: () => true, textContent: 'blocked hybrid title' };
  assert.equal(
    buildFilterPredicate({ tab: [], title: ['blocked'] })(hybrid),
    false,
  );
});

test('legacy no-tab filters include both media variants and reject other tabs early', () => {
  const { buildFilterPredicate } = sourceLoader()('src/feature/filter.ts');
  const predicate = buildFilterPredicate({ tab: ['노탭'], title: [] });
  const row = (hasImage, category) => ({
    closest: () => ({
      querySelector: (selector) =>
        selector === '.icon-picture'
          ? hasImage
            ? {}
            : null
          : category
            ? { textContent: category }
            : null,
    }),
  });
  assert.equal(predicate(row(false)), true);
  assert.equal(predicate(row(true)), true);
  assert.equal(predicate(row(false, '정보')), false);
});

test('navigation initialization returns while the next batch is still loading', async () => {
  const gate = deferred();
  let fetches = 0;
  const p = vaultFixture();
  const { activateArticleLink } = loadLink({
    fetchFirstBatch: async () => {
      fetches++;
      await gate.promise;
      p.articleList = [...p.articleList, '/community/board/300143/read/98'];
    },
  });
  await activateArticleLink(p, '100');
  assert.equal(p.activeIndex, 0);
  assert.equal(fetches, 1);
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
  ]);
  await activateArticleLink(p, '100');
  assert.equal(fetches, 1);
  gate.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(p.articleList.length, 3);
  assert.equal(p.saves, 1);
});

test('an empty list initializes immediately and resolves the exact article after links arrive', async () => {
  const gate = deferred();
  const p = vaultFixture({ articleList: [] });
  const { activateArticleLink } = loadLink({
    fetchFirstBatch: async () => {
      await gate.promise;
      p.articleList = [
        '/community/board/300143/read/1000',
        '/community/board/300143/read/100',
        '/community/board/300143/read/99',
      ];
    },
  });
  await activateArticleLink(p, '100');
  assert.equal(p.articleList.length, 0);
  assert.equal(p.activeIndex, -1);
  gate.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(p.activeIndex, 1);
});

test('home-series replenishment fetches channels together and preserves visited articles', async () => {
  const gates = [deferred(), deferred()];
  const started = [];
  const p = vaultFixture({
    isSeriesMode: true,
    articleList: [
      '/community/board/300143/read/102',
      '/community/board/300149/read/101',
      '/community/board/300143/read/100',
      '/community/board/300149/read/99',
    ],
    seriesChannels: ['community/board/300143', 'community/board/300149'],
  });
  const { activateArticleLink } = loadLink({
    showFetchLoader() {},
    hideFetchLoader() {},
    fetchChannelArticlesBefore: async (channel, minId) => {
      started.push([channel, minId]);
      return gates[channel === 'community/board/300143' ? 0 : 1].promise;
    },
  });
  await activateArticleLink(p, '100');
  assert.deepEqual(started, [
    ['community/board/300143', 100],
    ['community/board/300149', 99],
  ]);
  gates[0].resolve([
    '/community/board/300143/read/98',
    '/community/board/300143/read/98',
  ]);
  gates[1].resolve(['/community/board/300149/read/97']);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(p.activeIndex, 2);
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/102',
    '/community/board/300149/read/101',
    '/community/board/300143/read/100',
    '/community/board/300149/read/99',
    '/community/board/300143/read/98',
    '/community/board/300149/read/97',
  ]);
});

test('a filter change discards an old home-series response', async () => {
  const gate = deferred();
  const p = vaultFixture({
    isSeriesMode: true,
    seriesChannels: ['community/board/300143'],
  });
  const { activateArticleLink } = loadLink({
    showFetchLoader() {},
    hideFetchLoader() {},
    fetchChannelArticlesBefore: () => gate.promise,
  });
  await activateArticleLink(p, '100');
  p.articleFilterConfig = {
    'community/board/300143': { title: ['new-filter'] },
  };
  gate.resolve(['/community/board/300143/read/98']);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
  ]);
});

test('navigation persists the target index before leaving', async () => {
  const navigations = [];
  const p = vaultFixture({ activeIndex: 0 });
  const { toLink } = sourceLoader({
    globals: {
      window: {
        location: {
          replace: (url) => navigations.push([url, p.saves, p.activeIndex]),
        },
      },
    },
    mocks: { '@/utils': { getArrayItem: (list, index) => list[index] } },
  })('src/feature/swiper/page.ts');
  await toLink('NEXT')(p);
  assert.deepEqual(navigations, [['/community/board/300143/read/99', 1, 1]]);
});

test('Swiper is reused and background list changes unlock navigation', () => {
  let constructions = 0;
  let subscriber;
  class FakeSwiper {
    constructor(_selector, options) {
      constructions++;
      const { on, ...settings } = options;
      Object.assign(this, settings);
      this.events = on;
    }
    on() {}
    enable() {
      this.enabled = true;
    }
    disable() {
      this.enabled = false;
    }
    slideTo() {}
  }
  const p = vaultFixture({
    activeIndex: 0,
    articleList: ['/community/board/300143/read/100'],
    subscribe: (fn) => {
      subscriber = fn;
    },
  });
  const { initSwiperPage } = sourceLoader({
    mocks: {
      swiper: { default: FakeSwiper },
      './video': { installSwiperVideoPause() {} },
      './side-click': { installSideClick() {} },
      '@/core/app-events': { eventBus: {} },
    },
  })('src/feature/swiper/swiper.ts');
  initSwiperPage(p);
  assert.equal(p.swiper.speed, 300);
  assert.equal(p.swiper.maxBackfaceHiddenSlides, 0);
  assert.equal(p.swiper.allowSlideNext, false);
  p.articleList = [...p.articleList, '/community/board/300143/read/99'];
  subscriber({ href: p.href, articleFilterConfig: p.articleFilterConfig });
  assert.equal(p.swiper.allowSlideNext, true);
  p.articleFilterConfig = { 'community/board/300143': { disableSwiper: true } };
  initSwiperPage(p);
  assert.equal(p.swiper.enabled, false);
  assert.equal(constructions, 1);
});

test('Swiper keeps a single transform write per drag update and releases compositing at rest', () => {
  const handlers = new Map();
  const frames = new Map();
  let afterPaint;
  let frameId = 0;
  const { installSwipeCompositing, updateAfterSwipe } = sourceLoader({
    globals: {
      requestAnimationFrame: (callback) => {
        frames.set(++frameId, callback);
        return frameId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    mocks: {
      '@/utils/after-paint': {
        afterPaint(callback) {
          afterPaint = callback;
          return () => {
            afterPaint = undefined;
          };
        },
      },
    },
  })('src/feature/swiper/motion.ts');
  const swiper = {
    el: { classList: { toggle() {}, remove() {} } },
    wrapperEl: { style: {}, classList: new Set() },
    enabled: true,
    animating: false,
    on: (name, callback) => handlers.set(name, callback),
  };
  const { classList, style } = swiper.wrapperEl;
  classList.remove = classList.delete;
  const emit = (name, ...args) => handlers.get(name)(swiper, ...args);
  const move = (x, y = 0) => {
    style.transform = `translate3d(${x}px, ${y}px, 0px)`;
    emit('setTranslate');
    return style.transform;
  };
  const flushFrames = () => {
    for (const [id, callback] of frames) {
      frames.delete(id);
      callback();
    }
  };
  installSwipeCompositing(swiper);
  let uiUpdates = 0;
  const update = () => uiUpdates++;
  updateAfterSwipe(swiper, update);
  assert.equal(uiUpdates, 1);
  assert.equal(move(700, -20), 'translate(700px, -20px)');
  emit('sliderFirstMove');
  updateAfterSwipe(swiper, update);
  updateAfterSwipe(swiper, update);
  assert.equal(classList.has('rulifeed-swiper-moving'), true);
  assert.equal(move(650.5), 'translate3d(650.5px, 0px, 0px)');
  emit('touchEnd');
  emit('setTransition', 300);
  assert.equal(move(700), 'translate3d(700px, 0px, 0px)');
  swiper.animating = true;
  flushFrames();
  assert.equal(afterPaint, undefined);
  assert.equal(uiUpdates, 1);
  assert.equal(classList.has('rulifeed-swiper-moving'), true);
  swiper.animating = false;
  emit('transitionEnd');
  assert.equal(classList.size, 0);
  assert.equal(style.transform, 'translate(700px, 0px)');
  assert.equal(uiUpdates, 1);

  emit('sliderFirstMove');
  assert.equal(afterPaint, undefined);
  emit('touchEnd');
  flushFrames();
  assert.equal(classList.size, 0);
  afterPaint();
  assert.equal(uiUpdates, 2);

  emit('sliderFirstMove');
  emit('touchEnd');
  emit('destroy');
  assert.equal(classList.size, 0);
  assert.equal(frames.size, 0);
});

test('Swiper ignores article height changes and batches width changes until the next frame', () => {
  let notify;
  let disconnected = false;
  let updates = 0;
  const handlers = new Map();
  const frames = new Map();
  let frameId = 0;
  const element = { clientWidth: 720 };
  class FakeSwiper {
    constructor(_selector, options) {
      const { on, ...settings } = options;
      Object.assign(this, settings);
      this.events = on;
      this.el = element;
      this.width = 700;
    }
    on(name, callback) {
      handlers.set(name, callback);
    }
    update() {
      updates++;
    }
  }
  const { initSwiperPage } = sourceLoader({
    globals: {
      ResizeObserver: class {
        constructor(callback) {
          notify = callback;
        }
        observe(target) {
          assert.equal(target, element);
        }
        disconnect() {
          disconnected = true;
        }
      },
      requestAnimationFrame: (callback) => {
        frames.set(++frameId, callback);
        return frameId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    mocks: {
      swiper: { default: FakeSwiper },
      './video': { installSwiperVideoPause() {} },
      './side-click': { installSideClick() {} },
      '@/core/app-events': { eventBus: {} },
    },
  })('src/feature/swiper/swiper.ts');
  const p = vaultFixture({ subscribe() {} });
  initSwiperPage(p);
  assert.equal(p.swiper.resizeObserver, false);
  assert.equal(p.swiper.updateOnWindowResize, false);
  const resize = (width, height) =>
    notify([{ target: element, contentRect: { width, height } }]);
  resize(700, 1000);
  resize(700, 5000);
  assert.equal(frames.size, 0);
  resize(800, 5000);
  resize(900, 6000);
  assert.equal(frames.size, 1);
  const callback = frames.get(1);
  frames.delete(1);
  callback();
  assert.equal(updates, 1);
  resize(900, 7000);
  assert.equal(frames.size, 0);
  resize(1000, 7000);
  p.swiper.destroyed = true;
  handlers.get('destroy')();
  assert.equal(disconnected, true);
  assert.equal(frames.size, 0);
});

test('prefetch follows the next article, avoids repeat mutations and respects disabled Swiper', () => {
  let subscriber;
  const appended = [];
  const link = {
    relList: { supports: () => true },
    setAttribute() {},
    remove() {},
  };
  const p = vaultFixture({
    activeIndex: 0,
    searchQuery: '?articleKey=session',
    subscribe: (fn) => {
      subscriber = fn;
    },
  });
  const { initArticlePrefetch } = sourceLoader({
    globals: {
      window: windowFixture,
      document: {
        createElement: () => link,
        head: { append: (element) => appended.push(element.href) },
      },
    },
  })('src/feature/article/prefetch.ts');
  initArticlePrefetch(p);
  initArticlePrefetch(p);
  subscriber();
  assert.deepEqual(appended, [
    'https://bbs.ruliweb.com/community/board/300143/read/99?articleKey=session',
  ]);
  p.articleFilterConfig = { 'community/board/300143': { disableSwiper: true } };
  subscriber();
  assert.equal(appended.length, 1);
});

function listingAdapter(
  pages,
  fetchResponse,
  {
    showConfirmToast = () => assert.fail('unexpected search confirmation'),
    showToast = () => {},
  } = {},
) {
  const load = sourceLoader({
    globals: {
      ...domFixture(),
      window: windowFixture,
      AbortController,
      DOMParser: class {
        parseFromString(text) {
          return listingFixture(pages[text]);
        }
      },
    },
    mocks: {
      '@/utils/fetch': { fetchUrl: fetchResponse },
      '@/utils/toast': { showToast, showConfirmToast },
    },
  });
  return { load };
}

test('listing pages deduplicate existing URLs, duplicate rows and repeats across pages', async () => {
  const row = (href) => ({ href });
  const pages = {
    'community/board/300146': {
      rows: [
        row('/community/board/300143/read/100'),
        row('/community/board/300143/read/99'),
        row('/community/board/300143/read/99'),
      ],
      next: '?p=2',
    },
    'community/board/300147': {
      rows: [
        row('/community/board/300143/read/99'),
        row('/community/board/300143/read/98'),
      ],
      next: null,
    },
  };
  let calls = 0;
  const { load } = listingAdapter(pages, async () => ({
    responseText:
      calls++ === 0 ? 'community/board/300146' : 'community/board/300147',
  }));
  const { fetchAllBatches } = load('src/feature/article/fetch.ts');
  const p = vaultFixture({ articleList: ['/community/board/300143/read/100'] });
  await fetchAllBatches(p, '100');
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
    '/community/board/300143/read/98',
  ]);
  assert.equal(calls, 2);
});

test('skipping seen articles scans later pages and keeps seen links for backward navigation', async () => {
  const pages = {
    seen: { rows: [{ href: '/community/board/300143/read/99' }], next: '?p=2' },
    unseen: {
      rows: [{ href: '/community/board/300143/read/98' }],
      next: '?p=3',
    },
  };
  let calls = 0;
  const { load } = listingAdapter(pages, async () => ({
    responseText: calls++ === 0 ? 'seen' : 'unseen',
  }));
  const { fetchFirstBatch } = load('src/feature/article/fetch.ts');
  const p = vaultFixture({
    articleList: ['/community/board/300143/read/100'],
    activeIndex: 0,
    uiSettings: {
      skipVisitedContexts: { 'channel:community/board/300143': true },
    },
    reading: {
      hasVisited: (path) => path === '/community/board/300143/read/99',
    },
  });
  await fetchFirstBatch(p, '100');
  assert.equal(calls, 2);
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
    '/community/board/300143/read/98',
  ]);
  assert.equal(p.getAdjacentArticleIndex('NEXT'), 2);
  p.activeIndex = 2;
  assert.equal(p.getAdjacentArticleIndex('PREV'), 1);
});

for (const scenario of [
  {
    name: 'one next article remains',
    links: ['/community/board/300143/read/99'],
    expectedToasts: 0,
  },
  {
    name: 'multiple next articles remain',
    links: [
      '/community/board/300143/read/99',
      '/community/board/300143/read/98',
    ],
    expectedToasts: 0,
  },
  { name: 'no next article remains', links: [], expectedToasts: 1 },
  {
    name: 'only visited next articles remain with skipping enabled',
    links: ['/community/board/300143/read/99'],
    skipVisited: true,
    expectedToasts: 1,
  },
  {
    name: 'an unvisited next article remains with skipping enabled',
    links: [
      '/community/board/300143/read/99',
      '/community/board/300143/read/98',
    ],
    skipVisited: true,
    expectedToasts: 0,
  },
]) {
  test(`exhausted search toast when ${scenario.name}`, async () => {
    const toasts = [];
    const { load } = listingAdapter(
      { empty: { rows: [], next: null } },
      async () => ({ responseText: 'empty' }),
      { showToast: (message) => toasts.push(message) },
    );
    const p = vaultFixture({
      articleList: ['/community/board/300143/read/100', ...scenario.links],
      activeIndex: 0,
      uiSettings: {
        skipVisitedContexts: {
          'channel:community/board/300143': Boolean(scenario.skipVisited),
        },
      },
      reading: {
        hasVisited: (path) => path === '/community/board/300143/read/99',
      },
    });
    await load('src/feature/article/fetch.ts').fetchFirstBatch(p, '100');
    assert.equal(toasts.length, scenario.expectedToasts);
  });
}

for (const scenario of [
  {
    name: 'accepting continued search finds an unseen article past twenty pages',
    totalPages: 25,
    unseenPage: 22,
    accept: true,
    expectedRequests: 22,
    expectedPrompts: 1,
    expectedToasts: 0,
  },
  {
    name: 'declining continued search stops at the original page limit',
    totalPages: 25,
    unseenPage: 22,
    accept: false,
    expectedRequests: 10,
    expectedPrompts: 1,
    expectedToasts: 0,
  },
  {
    name: 'continued search stops at the end when every article was visited',
    totalPages: 12,
    accept: true,
    expectedRequests: 12,
    expectedPrompts: 1,
    expectedToasts: 1,
  },
  {
    name: 'an exhausted listing does not offer continued search',
    totalPages: 10,
    accept: true,
    expectedRequests: 10,
    expectedPrompts: 0,
    expectedToasts: 1,
  },
  {
    name: 'searching without skipping visited articles retains the page limit',
    totalPages: 25,
    skipVisited: false,
    accept: true,
    expectedRequests: 10,
    expectedPrompts: 0,
    expectedToasts: 1,
  },
]) {
  test(scenario.name, async () => {
    const skipVisited = scenario.skipVisited !== false;
    const pages = {};
    for (let page = 1; page <= scenario.totalPages; page++) {
      pages[page] = {
        rows: skipVisited
          ? [{ href: `/community/board/300143/read/${100 - page}` }]
          : [],
        next: page < scenario.totalPages ? `?p=${page + 1}` : null,
      };
    }
    const requests = [];
    const prompts = [];
    const toasts = [];
    const { load } = listingAdapter(
      pages,
      async (url) => {
        requests.push(url);
        return { responseText: String(requests.length) };
      },
      {
        showConfirmToast: async (message, label) => {
          prompts.push(message);
          assert.equal(label, '계속 검색');
          assert.equal(requests.length, 10);
          return scenario.accept;
        },
        showToast: (message) => toasts.push(message),
      },
    );
    const p = vaultFixture({
      articleList: ['/community/board/300143/read/100'],
      activeIndex: 0,
      subscribe: () => () => {},
      uiSettings: {
        skipVisitedContexts: { 'channel:community/board/300143': skipVisited },
      },
      reading: {
        hasVisited: (path) =>
          path !== `/community/board/300143/read/${100 - scenario.unseenPage}`,
      },
    });
    await load('src/feature/article/fetch.ts').fetchFirstBatch(p, '100');
    assert.deepEqual(
      requests,
      Array.from({ length: scenario.expectedRequests }, (_, index) =>
        index === 0
          ? '/community/board/300143/read/100'
          : `/community/board/300143?p=${index + 1}`,
      ),
    );
    assert.equal(prompts.length, scenario.expectedPrompts);
    if (prompts.length) assert.match(prompts[0], /찾을 때까지 계속 검색할까요/);
    assert.equal(toasts.length, scenario.expectedToasts);
    assert.equal(
      p.isNextPageActive(),
      Boolean(scenario.unseenPage && scenario.accept),
    );
    assert.equal(
      p.articleList.length,
      skipVisited ? scenario.expectedRequests + 1 : 1,
    );
  });
}

for (const action of ['continue', 'change-setting']) {
  test(`search pauses for the toast and handles ${action} while waiting`, async () => {
    const choice = deferred();
    const prompted = deferred();
    const pages = {};
    for (let page = 1; page <= 11; page++) {
      pages[page] = {
        rows: [{ href: `/community/board/300143/read/${100 - page}` }],
        next: `?p=${page + 1}`,
      };
    }
    let requests = 0;
    let subscriber;
    let signal;
    let unsubscribed = false;
    const { load } = listingAdapter(
      pages,
      async () => ({ responseText: String(++requests) }),
      {
        showConfirmToast: (_message, _label, abortSignal) => {
          signal = abortSignal;
          signal.addEventListener('abort', () => choice.resolve(false));
          prompted.resolve();
          return choice.promise;
        },
        showToast: () => assert.fail('unexpected failure toast'),
      },
    );
    const p = vaultFixture({
      articleList: ['/community/board/300143/read/100'],
      activeIndex: 0,
      uiSettings: {
        skipVisitedContexts: { 'channel:community/board/300143': true },
      },
      reading: {
        hasVisited: (path) => path !== '/community/board/300143/read/89',
      },
      subscribe: (callback) => {
        subscriber = callback;
        return () => (unsubscribed = true);
      },
    });
    const work = load('src/feature/article/fetch.ts').fetchFirstBatch(p, '100');
    await prompted.promise;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests, 10);
    assert.equal(unsubscribed, false);
    if (action === 'continue') choice.resolve(true);
    else {
      p.skipVisitedArticles = false;
      subscriber();
      assert.equal(signal.aborted, true);
    }
    await work;
    assert.equal(requests, action === 'continue' ? 11 : 10);
    assert.equal(unsubscribed, true);
    assert.equal(
      p.articleList.includes('/community/board/300143/read/89'),
      action === 'continue',
    );
  });
}

test('changing the skip setting discards an in-flight listing response', async () => {
  const gate = deferred();
  const pages = {
    'community/board/300146': {
      rows: [{ href: '/community/board/300143/read/98' }],
      next: '?p=2',
    },
  };
  let calls = 0;
  const { load } = listingAdapter(pages, () => {
    calls++;
    return gate.promise;
  });
  const { fetchFirstBatch } = load('src/feature/article/fetch.ts');
  const p = vaultFixture();
  const work = fetchFirstBatch(p, '100');
  p.skipVisitedArticles = true;
  gate.resolve({ responseText: 'community/board/300146' });
  await work;
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
  ]);
  assert.equal(calls, 1);
});

test('cyclic pagination stops before requesting a page again', async () => {
  const pages = { empty: { rows: [], next: '?p=2' } };
  let calls = 0;
  const { load } = listingAdapter(pages, async () => {
    calls++;
    return { responseText: 'empty' };
  });
  const { fetchAllBatches } = load('src/feature/article/fetch.ts');
  await fetchAllBatches(vaultFixture(), '100');
  assert.equal(calls, 2);
});

test('a filter change during a listing request discards its stale result', async () => {
  const gate = deferred();
  const pages = {
    'community/board/300146': {
      rows: [{ href: '/community/board/300143/read/98' }],
      next: null,
    },
  };
  const { load } = listingAdapter(pages, () => gate.promise);
  const { fetchFirstBatch } = load('src/feature/article/fetch.ts');
  const p = vaultFixture();
  const work = fetchFirstBatch(p, '100');
  p.articleFilterConfig = { 'community/board/300143': { title: ['changed'] } };
  gate.resolve({ responseText: 'community/board/300146' });
  await work;
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
  ]);
});

test('UI initialization installs one subscription and skips DOM work for article state changes', () => {
  let domWrites = 0;
  const subscribers = [];
  const dom = domFixture('<main class="body"><div id="board"></div></main>');
  const wrapper = dom.document.querySelector('#board');
  const nativeStyle = wrapper.style;
  Object.defineProperty(wrapper, 'style', {
    value: {
      setProperty(...args) {
        domWrites++;
        nativeStyle.setProperty(...args);
      },
    },
  });
  const { initUi } = sourceLoader({
    globals: { ...dom, window: { matchMedia: () => ({ matches: false }) } },
  })('src/feature/ui.ts');
  const p = vaultFixture({
    href: { mode: 'CHANNEL' },
    subscribe: (fn) => {
      subscribers.push(fn);
    },
  });
  initUi(p);
  initUi(p);
  assert.equal(subscribers.length, 1);
  domWrites = 0;
  subscribers[0]({ uiSettings: p.uiSettings, isSeriesMode: p.isSeriesMode });
  assert.equal(domWrites, 0);
  subscribers[0]({
    uiSettings: { ...p.uiSettings, lastModalTab: 'resume' },
    isSeriesMode: p.isSeriesMode,
  });
  assert.equal(domWrites, 0);
  subscribers[0]({
    uiSettings: { ...p.uiSettings, contentWidth: 900 },
    isSeriesMode: p.isSeriesMode,
  });
  assert.equal(domWrites, 1);
});

test('resize events perform one geometry read and style update per animation frame', () => {
  let geometryReads = 0;
  let styleWrites = 0;
  const frames = new Map();
  let nextFrame = 0;
  const dom = domFixture('<main class="body"><div id="board"></div></main>');
  const wrapper = dom.document.querySelector('#board');
  wrapper.getBoundingClientRect = () => {
    geometryReads++;
    return { left: 0, right: 700 };
  };
  const nativeStyle = wrapper.style;
  Object.defineProperty(wrapper, 'style', {
    value: {
      setProperty(...args) {
        styleWrites++;
        nativeStyle.setProperty(...args);
      },
    },
  });
  const send = (element, type, clientX) => {
    const event = new dom.Event(type);
    Object.defineProperty(event, 'clientX', { value: clientX });
    element.dispatchEvent(event);
  };
  const { initUi } = sourceLoader({
    globals: {
      ...dom,
      window: {
        matchMedia: (query) => ({ matches: query.includes('min-width') }),
      },
      requestAnimationFrame: (fn) => {
        const id = ++nextFrame;
        frames.set(id, fn);
        return id;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
  })('src/feature/ui.ts');
  const p = vaultFixture({
    href: { mode: 'CHANNEL' },
    uiSettings: { contentWidth: 700 },
    subscribe() {},
  });
  initUi(p);
  styleWrites = 0;
  send(
    wrapper.querySelector('.rulifeed-resize-handle-right'),
    'mousedown',
    700,
  );
  for (let index = 0; index < 100; index++)
    send(dom.document, 'mousemove', 800 + index);
  assert.equal(frames.size, 1);
  assert.equal(geometryReads, 0);
  frames.get(1)();
  assert.equal(geometryReads, 1);
  assert.equal(styleWrites, 1);
  send(dom.document, 'mouseup', 899);
  assert.equal(p.uiSettings.contentWidth, 899);
  assert.equal(p.saves, 1);
});

test('a direct article uses its DOM listing while saved sessions keep their existing order', async () => {
  let fetches = 0;
  const rows = [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
    '/community/board/300143/read/98',
    '/community/board/300143/read/97',
  ];
  const { initLink } = loadLink(
    {
      fetchFirstBatch: async () => {
        fetches++;
      },
    },
    rows,
  );
  const p = vaultFixture({ articleList: [] });
  await initLink(p);
  assert.deepEqual(p.articleList, rows);
  assert.equal(p.activeIndex, 0);
  const saved = vaultFixture({
    articleList: [
      '/community/board/300143/read/100',
      '/community/board/300143/read/90',
      '/community/board/300143/read/80',
      '/community/board/300143/read/70',
    ],
  });
  await initLink(saved);
  assert.deepEqual(saved.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/90',
    '/community/board/300143/read/80',
    '/community/board/300143/read/70',
  ]);
  assert.equal(fetches, 0);
});

test('best-only mode never seeds ordinary DOM rows and empty channels initialize without waiting', async () => {
  const gate = deferred();
  let fetches = 0;
  const styledModes = [];
  const { initLink } = loadLink(
    {
      fetchFirstBatch: async () => {
        fetches++;
        await gate.promise;
      },
    },
    ['/community/board/300143/read/99'],
    (p, applyCss) => {
      assert.equal(applyCss, true);
      styledModes.push(p.href.mode);
    },
  );
  const p = vaultFixture({
    articleList: [],
    articleFilterConfig: { 'community/board/300143': { onlyBest: true } },
  });
  await initLink(p);
  assert.deepEqual(p.articleList, []);
  assert.equal(fetches, 1);
  const channel = vaultFixture({
    href: {
      mode: 'CHANNEL',
      channelId: 'community/board/300143',
      articleId: '',
    },
    articleList: [],
    articleFilterConfig: { 'community/board/300143': { onlyBest: true } },
  });
  await initLink(channel);
  assert.deepEqual(styledModes, ['ARTICLE', 'CHANNEL']);
  assert.deepEqual(channel.articleList, []);
  assert.equal(fetches, 2);
  assert.equal(channel.isNextPageActive(), false);
  gate.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(styledModes.slice(2).sort(), ['ARTICLE', 'CHANNEL']);
});

test('best-only opacity follows fetched membership and resets when the option is disabled', () => {
  const document = listingFixture({
    rows: [
      {
        href: '/community/board/300143/read/100?articleKey=session',
        title: 'best',
      },
      { href: '/community/board/300143/read/99', title: 'ordinary' },
      { href: '/community/board/300143/read/98', title: 'excluded best' },
    ],
  });
  const rows = Array.from(document.querySelectorAll('a.subject_link'));
  const { filterLink } = sourceLoader({ globals: { document } })(
    'src/feature/filter.ts',
  );
  const p = vaultFixture({
    href: {
      mode: 'CHANNEL',
      channelId: 'community/board/300143',
      articleKey: '',
      search: '',
    },
    articleList: [],
    articleFilterConfig: {
      'community/board/300143': {
        tab: [],
        title: ['excluded'],
        onlyBest: true,
      },
    },
  });
  filterLink(p, true);
  assert.deepEqual(
    rows.map((row) => row.style.opacity),
    ['0.5', '0.5', '0.5'],
  );
  p.articleList = [
    '/community/board/300143/read/100',
    '/community/board/300143/read/98',
  ];
  filterLink(p, true);
  assert.deepEqual(
    rows.map((row) => row.style.opacity),
    ['1', '0.5', '0.5'],
  );
  p.href.search = '?view_best=1';
  filterLink(p, true);
  assert.deepEqual(
    rows.map((row) => row.style.opacity),
    ['1', '1', '0.5'],
  );
  p.href.search = '';
  p.articleFilterConfig['community/board/300143'].onlyBest = false;
  filterLink(p, true);
  assert.deepEqual(
    rows.map((row) => row.style.opacity),
    ['1', '1', '0.5'],
  );
});

test('step execution keeps parallel work, sequential dependencies and follow-ups in order', async () => {
  const { StepRunner } = sourceLoader()('src/core/step-runner.ts');
  const runner = new StepRunner();
  const gate = deferred();
  const events = [];
  const p = vaultFixture();
  const work = runner.run(p, [
    [
      async () => {
        events.push('community/board/300151');
        await gate.promise;
        return [p, () => events.push('follow-up')];
      },
      () => {
        events.push('b');
      },
    ],
    () => {
      events.push('c');
      return () => events.push('last');
    },
  ]);
  assert.deepEqual(events, ['community/board/300151', 'b']);
  gate.resolve();
  await work;
  assert.deepEqual(events, [
    'community/board/300151',
    'b',
    'follow-up',
    'c',
    'last',
  ]);
  assert.equal(p.saves, 1);
});

test('repository returns native objects without parsing or serializing payloads', () => {
  const storage = memoryStorage();
  const load = sourceLoader({
    globals: {
      JSON: {
        parse() {
          assert.fail('payload parse');
        },
        stringify() {
          assert.fail('payload stringify');
        },
      },
    },
  });
  const { StorageRepository } = load('src/vault/repository.ts');
  const repo = new StorageRepository(storage);
  repo.saveSetting('display', { contentWidth: 800 });
  const first = repo.readSetting('display');
  assert.equal(repo.readSetting('display'), first);
  assert.deepEqual(first, { contentWidth: 800 });
  repo.saveSetting('display', { contentWidth: 900 });
  assert.deepEqual(repo.readSetting('display'), { contentWidth: 900 });
});

test('config getters retain lazy normalization without JSON conversion through state updates', () => {
  const storage = memoryStorage({
    'ruliFeed:articleFilterConfig': '{"community/board/300143":{}}',
    'ruliFeed:displaySettings': '{"contentWidth":800}',
    'ruliFeed:settingsVersion': '2',
    'ruliFeed:session:articleList': '["/community/board/300143/read/100"]',
  });
  const parsed = [];
  const load = sourceLoader({
    globals: {
      window: windowFixture,
      JSON: {
        stringify: JSON.stringify,
        parse(raw) {
          parsed.push(raw);
          return JSON.parse(raw);
        },
      },
    },
  });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const { Store } = load('src/vault/store.ts');
  const store = new Store(
    new ConfigService(new StorageRepository(storage)).loadConfig(),
  );
  assert.deepEqual(parsed, []);
  store.setState({ readingRevision: 1 });
  assert.deepEqual(parsed, []);
  assert.equal(store.getState().uiSettings.contentWidth, 800);
  assert.deepEqual(parsed, []);
  assert.equal(store.getState().uiSettings.contentWidth, 800);
  store.setState({ articleList: ['/community/board/300143/read/101'] });
  assert.deepEqual(store.getState().articleList, [
    '/community/board/300143/read/101',
  ]);
  assert.deepEqual(parsed, []);
});

test('reading payloads load independently on demand and reload leaves unused sessions untouched', () => {
  const storage = memoryStorage({
    'rulifeed:recentArticles': '[]',
    'ruliFeed:readingHistory': '{"sessions":[]}',
    'ruliFeed:readingProgress': '[]',
  });
  const parsed = [];
  const load = sourceLoader({
    globals: {
      window: windowFixture,
      localStorage: storage,
      JSON: {
        stringify: JSON.stringify,
        parse(raw) {
          parsed.push(raw);
          return JSON.parse(raw);
        },
      },
    },
  });
  const { ReadingHistory } = load('src/vault/reading-history.ts');
  const reading = new ReadingHistory();
  assert.deepEqual(parsed, []);
  assert.equal(reading.hasVisited('/community/board/300143/read/100'), false);
  assert.deepEqual(parsed, ['[]']);
  reading.reload();
  assert.deepEqual(parsed, ['[]']);
  assert.deepEqual(reading.sessions, []);
  assert.deepEqual(parsed, ['[]']);
  void reading.sessions;
  assert.equal(parsed.length, 1);
});

test('short navigation lists do not load unrelated series channel settings', () => {
  const storage = memoryStorage({
    'ruliFeed:session:articleList': '["/community/board/300143/read/100"]',
    'ruliFeed:session:seriesChannels': '["unused"]',
  });
  const reads = [];
  const getItem = storage.getItem.bind(storage);
  storage.getItem = (key) => {
    reads.push(key);
    return getItem(key);
  };
  const load = sourceLoader({ globals: { window: windowFixture } });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const config = new ConfigService(new StorageRepository(storage)).loadConfig();
  reads.length = 0;
  assert.deepEqual(config.articleList, ['/community/board/300143/read/100']);
  assert.ok(!reads.includes('ruliFeed:session:seriesChannels'));
  assert.ok(!reads.includes('ruliFeed:articleFilterConfig'));
  assert.ok(!reads.includes('ruliFeed:uiSettings'));
});

test('prefetch matches skipped navigation URLs and removes link when Swiper is disabled', () => {
  let subscriber;
  const appended = [];
  const link = {
    relList: { supports: () => true },
    setAttribute() {},
    removed: false,
    remove() {
      this.removed = true;
    },
  };
  const p = vaultFixture({
    activeIndex: 0,
    searchQuery: '?articleKey=session',
    articleList: [
      '/community/board/300143/read/100',
      '/community/board/300143/read/99',
      '/community/board/300143/read/98',
    ],
    reading: {
      hasVisited: (path) => path === '/community/board/300143/read/99',
    },
    subscribe: (fn) => {
      subscriber = fn;
    },
  });
  p.skipVisitedArticles = true;
  const { initArticlePrefetch } = sourceLoader({
    globals: {
      window: windowFixture,
      document: {
        createElement: (tag) => {
          assert.equal(tag, 'link');
          return link;
        },
        head: {
          append: (element) => {
            element.removed = false;
            appended.push(element.href);
          },
        },
      },
    },
  })('src/feature/article/prefetch.ts');
  initArticlePrefetch(p);
  assert.deepEqual(appended, [
    'https://bbs.ruliweb.com/community/board/300143/read/98?articleKey=session&ruliFeedSkipped=1',
  ]);
  p.articleFilterConfig = { 'community/board/300143': { disableSwiper: true } };
  subscriber({
    articleList: p.articleList,
    activeIndex: p.activeIndex,
    searchQuery: p.searchQuery,
    href: p.href,
    articleFilterConfig: p.articleFilterConfig,
    readingRevision: 0,
    uiSettings: p.uiSettings,
  });
  assert.equal(link.removed, true);
  assert.equal(appended.length, 1);
});

test('Swiper pre-promotes compositing on touchStart, releases on vertical scroll, and guards mid-transition retouch', () => {
  const handlers = new Map();
  const frames = new Map();
  let frameId = 0;
  const { installSwipeCompositing } = sourceLoader({
    globals: {
      requestAnimationFrame: (callback) => {
        frames.set(++frameId, callback);
        return frameId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    mocks: {
      '@/utils/after-paint': {
        afterPaint: () => () => {},
      },
    },
  })('src/feature/swiper/motion.ts');
  const swiper = {
    el: { classList: { toggle() {}, remove() {} } },
    wrapperEl: {
      style: { transform: 'translate(-360px, 0px)' },
      classList: new Set(),
    },
    enabled: true,
    animating: false,
    on: (name, callback) => handlers.set(name, callback),
  };
  const { classList, style } = swiper.wrapperEl;
  classList.remove = classList.delete;
  const emit = (name, ...args) => handlers.get(name)(swiper, ...args);

  installSwipeCompositing(swiper);
  // Pre-promote on touchStart before horizontal drag threshold is crossed.
  emit('touchStart');
  assert.equal(classList.has('rulifeed-swiper-moving'), true);
  assert.equal(style.transform, 'translate3d(-360px, 0px, 0px)');

  // Release immediately when the gesture turns into a vertical scroll.
  emit('touchMoveOpposite');
  assert.equal(classList.has('rulifeed-swiper-moving'), false);
  assert.equal(style.transform, 'translate(-360px, 0px)');

  // Keep compositing intact when a retouch interrupts an active transition.
  emit('setTransition', 300);
  swiper.animating = true;
  emit('touchStart');
  swiper.animating = false;
  emit('transitionEnd');
  assert.equal(classList.has('rulifeed-swiper-moving'), true);
  assert.equal(style.transform, 'translate3d(-360px, 0px, 0px)');

  emit('touchEnd');
  for (const [id, callback] of frames) {
    frames.delete(id);
    callback();
  }
  assert.equal(classList.has('rulifeed-swiper-moving'), false);
  assert.equal(style.transform, 'translate(-360px, 0px)');
});

test('initReading defers parsing visits until needed when visited skipping is off', () => {
  const storage = memoryStorage({
    'rulifeed:recentArticles': JSON.stringify([
      {
        path: `/community/board/300143/read/${99}`,
        title: 'Seen',
        channelName: '게시판',
        visitedAt: 1700000000 * 1000,
      },
    ]),
  });
  const parsed = [];
  const loadListeners = [];
  const load = sourceLoader({
    globals: {
      window: {
        ...windowFixture,
        scrollY: 0,
        addEventListener(type, fn) {
          if (type === 'load') loadListeners.push(fn);
        },
        removeEventListener() {},
      },
      document: {
        visibilityState: 'visible',
        addEventListener() {},
        querySelector: () => null,
      },
      localStorage: storage,
      sessionStorage: memoryStorage(),
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
      JSON: {
        stringify: JSON.stringify,
        parse(raw) {
          parsed.push(raw);
          return JSON.parse(raw);
        },
      },
    },
    mocks: {
      './filter': { extractArticleRows: () => [] },
      './article/link': { refreshUnvisitedNavigation() {} },
    },
  });
  const { VaultAdapter } = load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const { initReading } = load('src/feature/reading.ts');
  const vault = new VaultAdapter(
    new Store({
      articleKey: 'session',
      articleList: ['/community/board/300143/read/100'],
      uiSettings: { showVisitedIndicators: false },
    }),
    { saveConfig() {} },
    vaultFixture().href,
  );
  initReading(vault);
  for (const fn of loadListeners) fn();
  assert.deepEqual(parsed, []);
});

test('equalData compares arrays directly and distinguishes arrays from objects', () => {
  const { equalData, addressId } = sourceLoader()('src/vault/record-schema.ts');
  assert.equal(
    equalData(
      ['/community/board/300151/read/1', '/community/board/300151/read/2'],
      ['/community/board/300151/read/1', '/community/board/300151/read/2'],
    ),
    true,
  );
  assert.equal(
    equalData(
      ['/community/board/300151/read/1', '/community/board/300151/read/2'],
      ['/community/board/300151/read/1', '/community/board/300151/read/3'],
    ),
    false,
  );
  assert.equal(
    equalData(['/community/board/300151/read/1'], {
      0: '/community/board/300151/read/1',
    }),
    false,
  );
  assert.equal(
    equalData({ 0: '/community/board/300151/read/1' }, [
      '/community/board/300151/read/1',
    ]),
    false,
  );
  assert.notEqual(
    addressId({ store: 'lists', key: ['resume', 'community/board/300151'] }),
    addressId({
      store: 'lists',
      key: ['navigation', 'community/board/300151'],
    }),
  );
  assert.notEqual(
    addressId({ store: 'settings', key: 'community/board/300151' }),
    addressId({ store: 'channelFilters', key: 'community/board/300151' }),
  );
});

test('navigation control observes only direct body children instead of subtree mutations', () => {
  const observations = [];
  class Observer {
    observe(target, options) {
      observations.push({ target, options });
    }
    disconnect() {}
  }
  const dom = domFixture();
  const body = dom.document.body;
  const { initNavigationList } = sourceLoader({
    globals: {
      ...dom,
      window: {
        addEventListener() {},
        removeEventListener() {},
      },
      ResizeObserver: Observer,
      MutationObserver: Observer,
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
    },
    mocks: {
      './readingUi': {},
      '@/feature/swiper/page': {},
      '@/feature/article/loading': {
        isArticleLoading: () => false,
        subscribeArticleLoading: () => () => {},
      },
    },
  })('src/feature/modal/navigationTab.ts');
  initNavigationList(vaultFixture({ subscribe: () => () => {} }));
  const bodyObservation = observations.find((item) => item.target === body);
  assert.ok(bodyObservation);
  assert.deepEqual(bodyObservation.options, { childList: true });
});

test('css minify loader preserves calc, media queries, pseudo selectors and strings', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { minifyCss } = require('../scripts/css-minify-loader.cjs');
  const input = `
    /* header comment */
    @media (min-width: 1024px) and (pointer: fine) {
      .box :where(.item) {
        width: calc(100% - 12px);
        content: "a : b ; /* keep */";
        background: url("data:image/svg+xml;utf8,<svg></svg>");
      }
    }
  `;
  const output = minifyCss(input);
  assert.ok(!output.includes('header comment'));
  assert.ok(output.includes('@media (min-width:1024px) and (pointer:fine){'));
  assert.ok(output.includes('.box :where(.item){'));
  assert.ok(output.includes('width:calc(100% - 12px);'));
  assert.ok(output.includes('content:"a : b ; /* keep */";'));
  assert.ok(output.includes('url("data:image/svg+xml;utf8,<svg></svg>")'));
  assert.ok(!output.includes(';}'));
});
