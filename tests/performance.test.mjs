import assert from 'node:assert/strict';
import test from 'node:test';
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
    href: 'https://arca.live/b/test/100?articleKey=session',
    origin: 'https://arca.live',
  },
  history: { replaceState() {} },
};

function loadLink(fetches, rows = []) {
  return sourceLoader({
    globals: { console: quietConsole },
    mocks: {
      './fetch': fetches,
      '@/feature/filter': { filterLink: () => rows },
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
  first.getState().uiSettings.homeSeriesChannels.push('test');
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
    articleList: ['/b/test/100'],
    activeIndex: 0,
  };
  config.saveConfig(state);
  storage.writes.length = 0;
  config.saveConfig(state);
  assert.equal(storage.writes.length, 0);
  config.saveConfig({ ...state, activeIndex: 1 });
  assert.deepEqual(storage.writes, [
    { key: 'arcaFeed:session:lastActiveIndex', value: '1' },
  ]);
  storage.writes.length = 0;
  config.saveConfig({
    ...state,
    activeIndex: 1,
    articleList: [...state.articleList, '/b/test/99'],
  });
  assert.deepEqual(
    storage.writes.map((entry) => entry.key),
    ['arcaFeed:session:articleList'],
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
  assert.equal(storage.getItem('arcaFeed:second:articleList'), '[]');
  assert.equal(storage.getItem('arcaFeed:second:seriesMode'), 'false');
  assert.equal(storage.getItem('arcaFeed:second:searchQuery'), '');
  assert.equal(storage.getItem('arcaFeed:second:lastActiveIndex'), '-1');
  assert.ok(
    storage.writes.every((entry) => entry.key !== 'arcaFeed:uiSettings'),
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
    articleList: ['/b/test/100', '/b/test/99'],
  });
  const config = new ConfigService(new StorageRepository(storage));
  const store = new Store(config.loadConfig());
  storage.writes.length = 0;
  store.setState({ activeIndex: 0 });
  config.saveConfig(store.getState());
  assert.equal(storage.writes.length, 0);
});

test('cache pruning removes orphaned legacy caches even when the recency list is unchanged', () => {
  const { StorageRepository } = sourceLoader()('src/vault/repository.ts');
  const storage = memoryStorage({
    'arcaFeed:recentArticleKeys': JSON.stringify(['current']),
    'arcaFeed:current:articleList': '[]',
    'arcaFeed:orphan:articleList': 'large old list',
    'arcaFeed:orphan:searchQuery': '?q=old',
    'arcaFeed:readingHistory': '{"sessions":[]}',
    'arcaFeed:readingProgress': '[]',
    'arcaFeed:custom:unknown': 'keep',
    recent_articles: 'native history',
  });
  new StorageRepository(storage).pruneArticleKeyCaches('current');
  assert.equal(storage.getItem('arcaFeed:orphan:articleList'), null);
  assert.equal(storage.getItem('arcaFeed:orphan:searchQuery'), null);
  assert.equal(storage.getItem('arcaFeed:current:articleList'), '[]');
  assert.equal(storage.getItem('arcaFeed:readingProgress'), '[]');
  assert.equal(storage.getItem('arcaFeed:readingHistory'), '{"sessions":[]}');
  assert.equal(storage.getItem('arcaFeed:custom:unknown'), 'keep');
  assert.equal(storage.getItem('recent_articles'), 'native history');
  assert.equal(storage.writes.length, 0);
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
  assert.equal(storage.writes.length, 3);
  assert.ok(
    storage.writes.every((entry) => !entry.key.startsWith('arcaFeed::')),
  );
});

test('cache pruning leaves the current recency list alone and removes expired session data', () => {
  const { StorageRepository } = sourceLoader()('src/vault/repository.ts');
  const keys = ['a', 'b', 'c', 'd', 'e'];
  const storage = memoryStorage({
    'arcaFeed:recentArticleKeys': JSON.stringify(keys),
    'arcaFeed:e:articleList': '[]',
    unrelated: 'keep',
  });
  const repo = new StorageRepository(storage);
  repo.pruneArticleKeyCaches('a');
  assert.equal(storage.writes.length, 0);
  repo.pruneArticleKeyCaches('f');
  assert.equal(storage.getItem('arcaFeed:e:articleList'), null);
  assert.equal(storage.getItem('unrelated'), 'keep');
  assert.deepEqual(JSON.parse(storage.getItem('arcaFeed:recentArticleKeys')), [
    'f',
    'a',
    'b',
    'c',
    'd',
  ]);
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
  const first = fetchUrl('/b/test');
  const second = fetchUrl('https://arca.live/b/test');
  assert.equal(first, second);
  assert.equal(calls, 1);
  response.resolve({ ok: true, text: async () => 'html' });
  assert.deepEqual(await first, { responseText: 'html' });
  await fetchUrl('/b/test');
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
  await assert.rejects(fetchUrl('/b/test'), /HTTP 503/);
  await assert.rejects(fetchUrl('/b/test'), /HTTP 503/);
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
    fetchUrl('/b/test', 'GET', 100),
    fetchUrl('/b/test', 'GET', 200),
    fetchUrl('/b/test', 'POST'),
    fetchUrl('/b/test', 'POST'),
  ]);
  assert.equal(calls, 4);
});

test('title-only filters work without selecting tabs and read the title once', () => {
  const { buildFilterPredicate } = sourceLoader({ mocks: { jquery: {} } })(
    'src/feature/filter.ts',
  );
  let titleReads = 0;
  const row = {
    matches: () => false,
    querySelector(selector) {
      assert.equal(selector, '.title');
      titleReads++;
      return { textContent: 'a normal title' };
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
  const { buildFilterPredicate } = sourceLoader({ mocks: { jquery: {} } })(
    'src/feature/filter.ts',
  );
  const predicate = buildFilterPredicate({ tab: ['노탭'], title: [] });
  const row = (hasImage) => ({
    querySelector: (selector) =>
      selector === '.media-icon.bi-images' && hasImage ? {} : null,
  });
  assert.equal(predicate(row(false)), true);
  assert.equal(predicate(row(true)), true);
  assert.equal(
    predicate({ querySelector: () => ({ textContent: 'other' }) }),
    false,
  );
});

test('navigation initialization returns while the next batch is still loading', async () => {
  const gate = deferred();
  let fetches = 0;
  const p = vaultFixture();
  const { activateArticleLink } = loadLink({
    fetchFirstBatch: async () => {
      fetches++;
      await gate.promise;
      p.articleList = [...p.articleList, '/b/test/98'];
    },
  });
  await activateArticleLink(p, '100');
  assert.equal(p.activeIndex, 0);
  assert.equal(fetches, 1);
  assert.deepEqual(p.articleList, ['/b/test/100', '/b/test/99']);
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
      p.articleList = ['/b/test/1000', '/b/test/100', '/b/test/99'];
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
    articleList: ['/b/test/102', '/b/other/101', '/b/test/100', '/b/other/99'],
    seriesChannels: ['test', 'other'],
  });
  const { activateArticleLink } = loadLink({
    showFetchLoader() {},
    hideFetchLoader() {},
    fetchChannelArticlesBefore: async (channel, minId) => {
      started.push([channel, minId]);
      return gates[channel === 'test' ? 0 : 1].promise;
    },
  });
  await activateArticleLink(p, '100');
  assert.deepEqual(started, [
    ['test', 100],
    ['other', 99],
  ]);
  gates[0].resolve(['/b/test/98', '/b/test/98']);
  gates[1].resolve(['/b/other/97']);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(p.activeIndex, 2);
  assert.deepEqual(p.articleList, [
    '/b/test/102',
    '/b/other/101',
    '/b/test/100',
    '/b/other/99',
    '/b/test/98',
    '/b/other/97',
  ]);
});

test('a filter change discards an old home-series response', async () => {
  const gate = deferred();
  const p = vaultFixture({
    isSeriesMode: true,
    seriesChannels: ['test'],
  });
  const { activateArticleLink } = loadLink({
    showFetchLoader() {},
    hideFetchLoader() {},
    fetchChannelArticlesBefore: () => gate.promise,
  });
  await activateArticleLink(p, '100');
  p.articleFilterConfig = { test: { title: ['new-filter'] } };
  gate.resolve(['/b/test/98']);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(p.articleList, ['/b/test/100', '/b/test/99']);
});

test('navigation persists the target index before leaving', () => {
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
  toLink('NEXT')(p);
  assert.deepEqual(navigations, [['/b/test/99', 1, 1]]);
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
    articleList: ['/b/test/100'],
    subscribe: (fn) => {
      subscriber = fn;
    },
  });
  const { initSwiperPage } = sourceLoader({
    mocks: {
      jquery: {},
      swiper: { default: FakeSwiper },
      '@/core/app-events': { eventBus: {} },
    },
  })('src/feature/swiper/swiper.ts');
  initSwiperPage(p);
  assert.equal(p.swiper.speed, 300);
  assert.equal(p.swiper.maxBackfaceHiddenSlides, 0);
  const wrapperEl = { style: {} };
  // Keep initial centering, drag, RTL and vertical coordinates unchanged.
  for (const [x, y] of [
    [-700, 0],
    [-650.5, 0],
    [700, 0],
    [0, -700],
  ]) {
    wrapperEl.style.transform = `translate3d(${x}px, ${y}px, 0px)`;
    p.swiper.events.setTranslate({ wrapperEl });
    assert.equal(wrapperEl.style.transform, `translate(${x}px, ${y}px)`);
  }
  assert.equal(p.swiper.allowSlideNext, false);
  p.articleList = [...p.articleList, '/b/test/99'];
  subscriber({ href: p.href, articleFilterConfig: p.articleFilterConfig });
  assert.equal(p.swiper.allowSlideNext, true);
  p.articleFilterConfig = { test: { disableSwiper: true } };
  initSwiperPage(p);
  assert.equal(p.swiper.enabled, false);
  assert.equal(constructions, 1);
});

test('Swiper ignores article height changes and batches width changes until the next frame', () => {
  let notify;
  let disconnected = false;
  let updates = 0;
  const handlers = new Map();
  const frames = new Map();
  let frameId = 0;
  const element = { clientWidth: 700 };
  class FakeSwiper {
    constructor(_selector, options) {
      const { on, ...settings } = options;
      Object.assign(this, settings);
      this.events = on;
      this.el = element;
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
      jquery: {},
      swiper: { default: FakeSwiper },
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
    'https://arca.live/b/test/99?articleKey=session',
  ]);
  p.articleFilterConfig = { test: { disableSwiper: true } };
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
  const loader = {
    length: 1,
    addClass() {
      return this;
    },
    removeClass() {
      return this;
    },
  };
  function jquery(value) {
    if (typeof value === 'string') return loader;
    if (value.href)
      return {
        attr: () => value.href,
        css() {},
      };
    return {
      find(selector) {
        if (selector === '.page-item.active')
          return {
            next: () => ({ find: () => ({ attr: () => value.next }) }),
          };
        return {
          not() {
            return this;
          },
          each(fn) {
            value.rows.forEach((row, index) => fn(index, row));
          },
        };
      },
    };
  }
  const load = sourceLoader({
    globals: {
      window: windowFixture,
      AbortController,
      DOMParser: class {
        parseFromString(text) {
          return { documentElement: pages[text] };
        }
      },
    },
    mocks: {
      jquery: { default: jquery },
      '@/utils/fetch': { fetchUrl: fetchResponse },
      '@/utils/toast': { showToast, showConfirmToast },
    },
  });
  return { load, jquery };
}

test('listing pages deduplicate existing URLs, duplicate rows and repeats across pages', async () => {
  const row = (href) => ({ href });
  const pages = {
    first: {
      rows: [row('/b/test/100'), row('/b/test/99'), row('/b/test/99')],
      next: '?p=2',
    },
    second: { rows: [row('/b/test/99'), row('/b/test/98')], next: null },
  };
  let calls = 0;
  const { load } = listingAdapter(pages, async () => ({
    responseText: calls++ === 0 ? 'first' : 'second',
  }));
  const { fetchAllBatches } = load('src/feature/article/fetch.ts');
  const p = vaultFixture({ articleList: ['/b/test/100'] });
  await fetchAllBatches(p, '100');
  assert.deepEqual(p.articleList, ['/b/test/100', '/b/test/99', '/b/test/98']);
  assert.equal(calls, 2);
});

test('skipping seen articles scans later pages and keeps seen links for backward navigation', async () => {
  const pages = {
    seen: { rows: [{ href: '/b/test/99' }], next: '?p=2' },
    unseen: { rows: [{ href: '/b/test/98' }], next: '?p=3' },
  };
  let calls = 0;
  const { load } = listingAdapter(pages, async () => ({
    responseText: calls++ === 0 ? 'seen' : 'unseen',
  }));
  const { fetchFirstBatch } = load('src/feature/article/fetch.ts');
  const p = vaultFixture({
    articleList: ['/b/test/100'],
    activeIndex: 0,
    uiSettings: { skipVisitedContexts: { 'channel:test': true } },
    reading: { hasVisited: (path) => path === '/b/test/99' },
  });
  await fetchFirstBatch(p, '100');
  assert.equal(calls, 2);
  assert.deepEqual(p.articleList, ['/b/test/100', '/b/test/99', '/b/test/98']);
  assert.equal(p.getAdjacentArticleIndex('NEXT'), 2);
  p.activeIndex = 2;
  assert.equal(p.getAdjacentArticleIndex('PREV'), 1);
});

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
        rows: skipVisited ? [{ href: `/b/test/${100 - page}` }] : [],
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
      articleList: ['/b/test/100'],
      activeIndex: 0,
      subscribe: () => () => {},
      uiSettings: { skipVisitedContexts: { 'channel:test': skipVisited } },
      reading: {
        hasVisited: (path) => path !== `/b/test/${100 - scenario.unseenPage}`,
      },
    });
    await load('src/feature/article/fetch.ts').fetchFirstBatch(p, '100');
    assert.deepEqual(
      requests,
      Array.from({ length: scenario.expectedRequests }, (_, index) =>
        index === 0 ? '100' : `100?p=${index + 1}`,
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
        rows: [{ href: `/b/test/${100 - page}` }],
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
      articleList: ['/b/test/100'],
      activeIndex: 0,
      uiSettings: { skipVisitedContexts: { 'channel:test': true } },
      reading: { hasVisited: (path) => path !== '/b/test/89' },
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
    assert.equal(p.articleList.includes('/b/test/89'), action === 'continue');
  });
}

test('changing the skip setting discards an in-flight listing response', async () => {
  const gate = deferred();
  const pages = { first: { rows: [{ href: '/b/test/98' }], next: '?p=2' } };
  let calls = 0;
  const { load } = listingAdapter(pages, () => {
    calls++;
    return gate.promise;
  });
  const { fetchFirstBatch } = load('src/feature/article/fetch.ts');
  const p = vaultFixture();
  const work = fetchFirstBatch(p, '100');
  p.skipVisitedArticles = true;
  gate.resolve({ responseText: 'first' });
  await work;
  assert.deepEqual(p.articleList, ['/b/test/100', '/b/test/99']);
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
  const pages = { first: { rows: [{ href: '/b/test/98' }], next: null } };
  const { load } = listingAdapter(pages, () => gate.promise);
  const { fetchFirstBatch } = load('src/feature/article/fetch.ts');
  const p = vaultFixture();
  const work = fetchFirstBatch(p, '100');
  p.articleFilterConfig = { test: { title: ['changed'] } };
  gate.resolve({ responseText: 'first' });
  await work;
  assert.deepEqual(p.articleList, ['/b/test/100', '/b/test/99']);
});

test('UI initialization installs one subscription and skips DOM work for article state changes', () => {
  let domWrites = 0;
  const subscribers = [];
  const empty = {
    length: 0,
    first() {
      return this;
    },
    each() {
      return this;
    },
    prependTo() {
      return this;
    },
    addClass() {
      domWrites++;
      return this;
    },
    toggleClass() {
      domWrites++;
      return this;
    },
    css() {
      domWrites++;
      return this;
    },
  };
  const { initUi } = sourceLoader({
    globals: { window: { matchMedia: () => ({ matches: false }) } },
    mocks: {
      jquery: { default: () => empty },
      '@/utils': { extractChannelId: () => null },
    },
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
  const handlers = new Map();
  const frames = new Map();
  let nextFrame = 0;
  const nativeWrapper = {
    getBoundingClientRect() {
      geometryReads++;
      return { left: 0, right: 700 };
    },
    style: {
      setProperty() {
        styleWrites++;
      },
    },
  };
  const chain = {
    length: 0,
    first() {
      return this;
    },
    each() {
      return this;
    },
    prependTo() {
      return this;
    },
    addClass() {
      return this;
    },
    removeClass() {
      return this;
    },
    toggleClass() {
      return this;
    },
    css() {
      return this;
    },
    append() {
      return this;
    },
    on(name, fn) {
      handlers.set(name, fn);
      return this;
    },
  };
  const wrapper = { ...chain, length: 1, 0: nativeWrapper };
  const document = {};
  const { initUi } = sourceLoader({
    globals: {
      document,
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
    mocks: {
      jquery: {
        default: (selector) =>
          selector === '.body .content-wrapper' ? wrapper : chain,
      },
      '@/utils': { extractChannelId: () => null },
    },
  })('src/feature/ui.ts');
  const p = vaultFixture({
    href: { mode: 'CHANNEL' },
    uiSettings: { contentWidth: 700 },
    subscribe() {},
  });
  initUi(p);
  handlers.get('mousedown')({
    clientX: 700,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  });
  for (let index = 0; index < 100; index++)
    handlers.get('mousemove.arcafeed-resize')({ clientX: 800 + index });
  assert.equal(frames.size, 1);
  assert.equal(geometryReads, 0);
  frames.get(1)();
  assert.equal(geometryReads, 1);
  assert.equal(styleWrites, 1);
  handlers.get('mouseup.arcafeed-resize')();
  assert.equal(p.uiSettings.contentWidth, 899);
  assert.equal(p.saves, 1);
});

test('a direct article uses its DOM listing while saved sessions keep their existing order', async () => {
  let fetches = 0;
  const rows = ['/b/test/100', '/b/test/99', '/b/test/98', '/b/test/97'];
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
    articleList: ['/b/test/100', '/b/test/90', '/b/test/80', '/b/test/70'],
  });
  await initLink(saved);
  assert.deepEqual(saved.articleList, [
    '/b/test/100',
    '/b/test/90',
    '/b/test/80',
    '/b/test/70',
  ]);
  assert.equal(fetches, 0);
});

test('best-only mode never seeds ordinary DOM rows and empty channels initialize without waiting', async () => {
  const gate = deferred();
  let fetches = 0;
  const { initLink } = loadLink(
    {
      fetchFirstBatch: async () => {
        fetches++;
        await gate.promise;
      },
    },
    ['/b/test/99'],
  );
  const p = vaultFixture({
    articleList: [],
    articleFilterConfig: { test: { onlyBest: true } },
  });
  await initLink(p);
  assert.deepEqual(p.articleList, []);
  assert.equal(fetches, 1);
  const channel = vaultFixture({
    href: { mode: 'CHANNEL', channelId: 'test', articleId: '' },
    articleList: [],
    articleFilterConfig: { test: { onlyBest: true } },
  });
  await initLink(channel);
  assert.equal(fetches, 2);
  assert.equal(channel.isNextPageActive(), false);
  gate.resolve();
  await new Promise((resolve) => setImmediate(resolve));
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
        events.push('a');
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
  assert.deepEqual(events, ['a', 'b']);
  gate.resolve();
  await work;
  assert.deepEqual(events, ['a', 'b', 'follow-up', 'c', 'last']);
  assert.equal(p.saves, 1);
});
