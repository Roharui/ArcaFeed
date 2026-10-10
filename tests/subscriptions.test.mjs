import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader, vaultFixture } from './source-loader.mjs';

test('/b/my and its query variants expose subscription settings while its articles remain articles', () => {
  const { parseHref } = sourceLoader({ globals: { console: { log() {} } } })(
    'src/utils/regex.ts',
  );
  for (const path of ['/b/my', '/b/my?p=2', '/b/my/'])
    assert.equal(parseHref(`https://arca.live${path}`).mode, 'HOME');
  assert.equal(parseHref('https://arca.live/b/my/123').mode, 'ARTICLE');
  assert.equal(parseHref('https://arca.live/b/test').mode, 'CHANNEL');
});

test('subscription discovery reads only the subscription menu and excludes aliases and duplicates', () => {
  const links = [
    { href: '/b/my', name: '구독 중인 채널' },
    { href: '/b/first', name: '첫 번째 채널' },
    { href: '/b/second?view=all', name: '두 번째 채널' },
    { href: '/b/first', name: '중복 채널' },
    { href: '/b/first/100', name: '게시글' },
    { href: 'https://example.com/b/third', name: '외부 채널' },
  ];
  const menu = {
    length: 1,
    find: () => ({
      each: (fn) => links.forEach((link, index) => fn(index, link)),
    }),
  };
  const scope = {
    find: (selector) => {
      assert.equal(selector, 'a[href="/b/my"]');
      return { first: () => ({ parent: () => menu }) };
    },
  };
  const { parseSubscribedChannels } = sourceLoader({
    mocks: {
      jquery: {
        default: (link) => ({
          attr: () => link.href,
          find: () => ({ first: () => ({ text: () => link.name }) }),
        }),
      },
    },
  })('src/feature/subscriptions.ts');
  assert.deepEqual(parseSubscribedChannels(scope), [
    { id: 'first', name: '첫 번째' },
    { id: 'second', name: '두 번째' },
  ]);
});

test('a channel filter reads only its own editor and preserves its navigation setting', () => {
  const { readArticleFilter } = sourceLoader({
    mocks: {
      jquery: {
        default: (element) => ({
          val: () => element.value,
          attr: () => element.text,
        }),
      },
    },
  })('src/feature/modal/filterUi.ts');
  const editor = (tab, title, onlyBest) => ({
    find: (selector) => {
      if (selector === '#filter-best-checkbox') return { prop: () => onlyBest };
      return {
        toArray: () =>
          selector === '.ele-category:checked'
            ? tab.map((value) => ({ value }))
            : title.map((text) => ({ text })),
      };
    },
  });
  assert.deepEqual(
    readArticleFilter(
      editor(['정보'], ['차단'], true),
      { disableSwiper: true },
      '첫 번째',
    ),
    {
      tab: ['정보'],
      title: ['차단'],
      onlyBest: true,
      disableSwiper: true,
      channelName: '첫 번째',
    },
  );
  assert.deepEqual(
    readArticleFilter(editor([], [], false), undefined, '두 번째'),
    {
      tab: [],
      title: [],
      onlyBest: false,
      disableSwiper: false,
      channelName: '두 번째',
    },
  );
});

test('best-only request URLs retain the channel path, cursor and existing search parameters', () => {
  const { withBestMode } = sourceLoader({
    mocks: { jquery: {}, '@/utils/toast': {} },
  })('src/feature/article/fetch.ts');
  for (const [url, expected] of [
    ['/b/zenlesszonezero', '/b/zenlesszonezero?mode=best'],
    ['/b/zenlesszonezero/99?p=2', '/b/zenlesszonezero/99?p=2&mode=best'],
    ['99?articleKey=session', '99?articleKey=session&mode=best'],
    ['?p=2&mode=all', '?p=2&mode=best'],
    [
      'https://arca.live/b/zenlesszonezero?p=2#list',
      'https://arca.live/b/zenlesszonezero?p=2&mode=best#list',
    ],
  ]) {
    assert.equal(withBestMode(url, { onlyBest: true }), expected);
    assert.equal(withBestMode(url, { onlyBest: false }), url);
    assert.equal(withBestMode(url), url);
  }
});

test('photo-only and best-only subscriptions fetch their own channel listings rather than the current /b/my feed', async () => {
  const requests = [];
  const navigations = [];
  const pages = {
    '/b/bluearchive': [
      { href: '/b/bluearchive/100', category: '사진' },
      { href: '/b/bluearchive/98', category: '일반' },
    ],
    '/b/zenlesszonezero': [{ href: '/b/zenlesszonezero/99' }],
    '/b/zenlesszonezero/99': [{ href: '/b/zenlesszonezero/97' }],
    // Resolving a query-only best URL here would leak the unfiltered aggregate feed.
    '/b/my': [
      { href: '/b/bluearchive/98', category: '일반' },
      { href: '/b/zenlesszonezero/97' },
    ],
  };
  const loader = {
    length: 1,
    addClass() {},
    removeClass() {},
  };
  const load = sourceLoader({
    globals: {
      window: {
        location: {
          href: 'https://arca.live/b/my',
          origin: 'https://arca.live',
          replace: (url) => navigations.push(url),
        },
      },
      DOMParser: class {
        parseFromString(path) {
          return { documentElement: pages[path] };
        }
      },
    },
    mocks: {
      jquery: {
        default: (value) => {
          if (typeof value === 'string') return loader;
          if (value.href) return { attr: () => value.href };
          return {
            find: (selector) =>
              selector === '.page-item.active'
                ? { next: () => ({ find: () => ({ attr: () => undefined }) }) }
                : {
                    not() {
                      return this;
                    },
                    each(fn) {
                      value.forEach((row, index) =>
                        fn(index, {
                          ...row,
                          querySelector: (selector) =>
                            selector === '.text-bg-success' && row.category
                              ? { textContent: row.category }
                              : null,
                        }),
                      );
                    },
                  },
          };
        },
      },
      '@/feature/subscriptions': {
        parseSubscribedChannels: () => [
          { id: 'bluearchive', name: '블루 아카이브' },
          { id: 'zenlesszonezero', name: '젠레스 존 제로' },
        ],
      },
      '@/feature/article/link': { refreshUnvisitedNavigation() {} },
      '@/utils/fetch': {
        fetchUrl: async (url) => {
          const resolved = new URL(url, 'https://arca.live/b/my');
          requests.push(`${resolved.pathname}${resolved.search}`);
          return { responseText: resolved.pathname };
        },
      },
      '@/utils/toast': { showToast: () => assert.fail('unexpected failure') },
    },
  });
  const p = vaultFixture({
    href: { ...vaultFixture().href, mode: 'HOME', channelId: 'my' },
    articleFilterConfig: {
      bluearchive: { tab: ['사진'], title: [], onlyBest: false },
      zenlesszonezero: { tab: [], title: [], onlyBest: true },
    },
  });
  await load('src/feature/modal/subscribeTab.ts').initStartHomeSeries(p);
  assert.deepEqual(requests, [
    '/b/bluearchive',
    '/b/zenlesszonezero?mode=best',
  ]);
  assert.deepEqual(p.articleList, [
    '/b/bluearchive/100',
    '/b/zenlesszonezero/99',
  ]);
  assert.deepEqual(navigations, [
    `https://arca.live/b/bluearchive/100?articleKey=${p.articleKey}`,
  ]);

  requests.length = 0;
  const additions = await load(
    'src/feature/article/fetch.ts',
  ).fetchChannelArticlesBefore(
    'zenlesszonezero',
    99,
    p.articleFilterConfig.zenlesszonezero,
  );
  assert.deepEqual(requests, ['/b/zenlesszonezero/99?mode=best']);
  assert.deepEqual(additions, ['/b/zenlesszonezero/97']);
});

test('bulk subscription startup applies independent channel filters, excludes hidden channels and skips native aliases', async () => {
  const firstFilter = {
    tab: ['정보'],
    title: ['차단'],
    onlyBest: true,
    disableSwiper: false,
  };
  const secondFilter = {
    tab: ['짤'],
    title: [],
    onlyBest: false,
    disableSwiper: false,
  };
  const calls = [];
  const navigations = [];
  const { initStartHomeSeries } = sourceLoader({
    globals: {
      window: {
        location: {
          origin: 'https://arca.live',
          replace: (url) => navigations.push(url),
        },
      },
    },
    mocks: {
      jquery: {},
      '@/feature/subscriptions': {
        parseSubscribedChannels: () => [
          { id: 'first', name: '첫 번째' },
          { id: 'second', name: '두 번째' },
          { id: 'hidden', name: '숨김' },
        ],
      },
      '@/feature/article/link': { refreshUnvisitedNavigation() {} },
      '@/feature/article/fetch': {
        showFetchLoader() {},
        hideFetchLoader() {},
        fetchChannelArticlesBefore: async (
          id,
          before,
          filter,
          _existing,
          visited,
        ) => {
          calls.push({ id, before, filter, visited });
          return id === 'first'
            ? ['/b/first/100', '/b/first/98']
            : ['/b/second/99', '/b/second/97'];
        },
      },
      '@/utils/toast': { showToast: () => assert.fail('unexpected failure') },
    },
  })('src/feature/modal/subscribeTab.ts');
  const visited = new Set(['/b/my/100']);
  const p = vaultFixture({
    href: { ...vaultFixture().href, mode: 'HOME', channelId: 'my' },
    articleFilterConfig: { first: firstFilter, second: secondFilter },
    uiSettings: {
      hiddenChannels: ['hidden'],
      skipVisitedContexts: { home: true },
    },
    reading: { getVisitedPaths: () => visited },
  });
  await initStartHomeSeries(p);
  assert.deepEqual(
    calls.map((call) => call.id),
    ['first', 'second'],
  );
  assert.equal(calls[0].filter, firstFilter);
  assert.equal(calls[1].filter, secondFilter);
  assert.ok(
    calls.every((call) => call.before === 0 && call.visited === visited),
  );
  assert.deepEqual(p.articleList, [
    '/b/first/100',
    '/b/second/99',
    '/b/first/98',
    '/b/second/97',
  ]);
  assert.deepEqual(p.seriesChannels, ['first', 'second']);
  assert.equal(p.activeIndex, 1);
  assert.deepEqual(navigations, [
    `https://arca.live/b/second/99?articleKey=${p.articleKey}`,
  ]);
});
