import assert from 'node:assert/strict';
import test from 'node:test';
import { domFixture, listingFixture } from './dom-fixture.mjs';
import { sourceLoader, vaultFixture } from './source-loader.mjs';

test('Ruliweb routes recognize mobile and desktop boards and reject external hosts', () => {
  const { parseHref } = sourceLoader({ globals: { console: { log() {} } } })(
    'src/utils/regex.ts',
  );
  for (const path of ['/', '/?page=2', '/#top'])
    assert.equal(parseHref(`https://bbs.ruliweb.com${path}`).mode, 'HOME');
  assert.equal(
    parseHref('https://bbs.ruliweb.com/community/board/300143/read/123').mode,
    'ARTICLE',
  );
  assert.equal(
    parseHref('https://bbs.ruliweb.com/community/board/300143').mode,
    'CHANNEL',
  );
  assert.deepEqual(
    parseHref(
      'https://m.ruliweb.com/game/board/123/read/456/?page=2&articleKey=active#cmt',
    ),
    {
      mode: 'ARTICLE',
      channelId: 'game/board/123',
      articleId: '456',
      articleKey: 'active',
      search: '?page=2&articleKey=active',
    },
  );
  for (const host of [
    'arca.live',
    'example.com',
    'm.ruliweb.com.example.com',
  ]) {
    assert.equal(
      parseHref(`https://${host}/game/board/123/read/456`).mode,
      'OTHER',
    );
  }
  assert.equal(
    parseHref('https://m.ruliweb.com/game/board/123/write').mode,
    'OTHER',
  );
});

test('subscription discovery reads only the subscription menu and excludes aliases and duplicates', () => {
  const links = [
    { href: '/', name: '구독 중인 채널' },
    { href: '/community/board/300146', name: '첫 번째 채널' },
    { href: '/community/board/300147?view=all', name: '두 번째 채널' },
    { href: '/community/board/300146', name: '중복 채널' },
    { href: '/community/board/300146/read/100', name: '게시글' },
    { href: 'https://example.com/community/board/300148', name: '외부 채널' },
  ];
  const scope = domFixture(
    `<nav id="nav_favorite">${links
      .map(
        ({ href, name }) =>
          `<a href="${href}"><span class="channel-name">${name}</span></a>`,
      )
      .join(
        '',
      )}</nav><div class="my-subscribe-channels"><a class="channel" href="/community/board/300150">Outside</a></div>`,
  ).document;
  const { parseSubscribedChannels } = sourceLoader()(
    'src/feature/subscriptions.ts',
  );
  assert.deepEqual(parseSubscribedChannels(scope), [
    { id: 'community/board/300146', name: '첫 번째 채널' },
    { id: 'community/board/300147', name: '두 번째 채널' },
  ]);
});

test('a channel filter reads only its own editor and preserves its navigation setting', () => {
  const { readArticleFilter } = sourceLoader()('src/feature/modal/filterUi.ts');
  const editor = (tab, title, onlyBest) => {
    const { document } = domFixture(`
      <input id="filter-best-checkbox" type="checkbox">
      ${tab.map((value) => `<input class="ele-category" type="checkbox" value="${value}" checked>`).join('')}
      ${title.map((text) => `<button class="exclude-title-tag" data-text="${text}"></button>`).join('')}
    `);
    document.querySelector('#filter-best-checkbox').checked = onlyBest;
    return document;
  };
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
    mocks: { '@/utils/toast': {} },
  })('src/feature/article/fetch.ts');
  for (const [url, expected] of [
    ['/community/board/300145', '/community/board/300145?view_best=1'],
    [
      '/community/board/300145/read/99?p=2',
      '/community/board/300145/read/99?p=2&view_best=1',
    ],
    ['99?articleKey=session', '99?articleKey=session&view_best=1'],
    ['?p=2&view_best=0', '?p=2&view_best=1'],
    [
      'https://bbs.ruliweb.com/community/board/300145?p=2#list',
      'https://bbs.ruliweb.com/community/board/300145?p=2&view_best=1#list',
    ],
  ]) {
    assert.equal(withBestMode(url, { onlyBest: true }), expected);
    assert.equal(withBestMode(url, { onlyBest: false }), url);
    assert.equal(withBestMode(url), url);
  }
});

test('photo-only and best-only subscriptions fetch their own channel listings rather than the current / feed', async () => {
  const requests = [];
  const navigations = [];
  const pages = {
    '/community/board/300144': [
      { href: '/community/board/300144/read/100', category: '사진' },
      { href: '/community/board/300144/read/98', category: '일반' },
    ],
    '/community/board/300145': [{ href: '/community/board/300145/read/99' }],
    '/community/board/300145/read/99': [
      { href: '/community/board/300145/read/97' },
    ],
    // Resolving a query-only best URL here would leak the unfiltered aggregate feed.
    '/': [
      { href: '/community/board/300144/read/98', category: '일반' },
      { href: '/community/board/300145/read/97' },
    ],
  };
  const load = sourceLoader({
    globals: {
      ...domFixture(),
      window: {
        location: {
          href: 'https://bbs.ruliweb.com/',
          origin: 'https://bbs.ruliweb.com',
          replace: (url) => navigations.push(url),
        },
      },
      DOMParser: class {
        parseFromString(path) {
          return listingFixture({ rows: pages[path] });
        }
      },
    },
    mocks: {
      '@/feature/subscriptions': {
        parseSubscribedChannels: () => [
          { id: 'community/board/300144', name: '블루 아카이브' },
          { id: 'community/board/300145', name: '젠레스 존 제로' },
        ],
      },
      '@/feature/article/link': { refreshUnvisitedNavigation() {} },
      '@/utils/fetch': {
        fetchUrl: async (url) => {
          const resolved = new URL(url, 'https://bbs.ruliweb.com/');
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
      'community/board/300144': { tab: ['사진'], title: [], onlyBest: false },
      'community/board/300145': { tab: [], title: [], onlyBest: true },
    },
  });
  await load('src/feature/modal/subscribeTab.ts').initStartHomeSeries(p);
  assert.deepEqual(requests, [
    '/community/board/300144',
    '/community/board/300145?view_best=1',
  ]);
  assert.deepEqual(p.articleList, [
    '/community/board/300144/read/100',
    '/community/board/300145/read/99',
  ]);
  assert.deepEqual(navigations, [
    `https://bbs.ruliweb.com/community/board/300144/read/100?articleKey=${p.articleKey}`,
  ]);

  requests.length = 0;
  const additions = await load(
    'src/feature/article/fetch.ts',
  ).fetchChannelArticlesBefore(
    'community/board/300145',
    99,
    p.articleFilterConfig['community/board/300145'],
  );
  assert.deepEqual(requests, ['/community/board/300145/read/99?view_best=1']);
  assert.deepEqual(additions, ['/community/board/300145/read/97']);
  const existing = new Set(['/community/board/300145/read/97']);
  existing[Symbol.iterator] = () =>
    assert.fail('the shared existing-link set must not be copied');
  for (const fetch of [
    () =>
      load('src/feature/article/fetch.ts').fetchChannelArticlesBefore(
        'community/board/300145',
        99,
        undefined,
        existing,
      ),
    () =>
      load('src/feature/article/fetch.ts').fetchChannelArticles(
        'community/board/300145',
        undefined,
        existing,
      ),
  ]) {
    const result = await fetch();
    assert.equal(result.includes('/community/board/300145/read/97'), false);
    assert.equal(existing.size, 1);
  }
});

test('bulk subscription startup applies independent channel filters, excludes hidden channels and skips visited articles', async () => {
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
      ...domFixture(),
      window: {
        location: {
          origin: 'https://bbs.ruliweb.com',
          replace: (url) => navigations.push(url),
        },
      },
    },
    mocks: {
      '@/feature/subscriptions': {
        parseSubscribedChannels: () => [
          { id: 'community/board/300146', name: '첫 번째 채널' },
          { id: 'community/board/300147', name: '두 번째 채널' },
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
          return id === 'community/board/300146'
            ? [
                '/community/board/300146/read/100',
                '/community/board/300146/read/98',
              ]
            : [
                '/community/board/300147/read/99',
                '/community/board/300147/read/97',
              ];
        },
      },
      '@/utils/toast': { showToast: () => assert.fail('unexpected failure') },
    },
  })('src/feature/modal/subscribeTab.ts');
  const visited = new Set(['/community/board/300146/read/100']);
  const p = vaultFixture({
    href: { ...vaultFixture().href, mode: 'HOME', channelId: 'my' },
    articleFilterConfig: {
      'community/board/300146': firstFilter,
      'community/board/300147': secondFilter,
    },
    uiSettings: {
      hiddenChannels: ['hidden'],
      skipVisitedContexts: { home: true },
    },
    reading: { getVisitedPaths: () => visited },
  });
  await initStartHomeSeries(p);
  assert.deepEqual(
    calls.map((call) => call.id),
    ['community/board/300146', 'community/board/300147'],
  );
  assert.equal(calls[0].filter, firstFilter);
  assert.equal(calls[1].filter, secondFilter);
  assert.ok(
    calls.every((call) => call.before === 0 && call.visited === visited),
  );
  assert.deepEqual(p.articleList, [
    '/community/board/300146/read/100',
    '/community/board/300147/read/99',
    '/community/board/300146/read/98',
    '/community/board/300147/read/97',
  ]);
  assert.deepEqual(p.seriesChannels, [
    'community/board/300146',
    'community/board/300147',
  ]);
  assert.equal(p.activeIndex, 1);
  assert.deepEqual(navigations, [
    `https://bbs.ruliweb.com/community/board/300147/read/99?articleKey=${p.articleKey}`,
  ]);
});

test('Ruliweb list parsing uses the gallery title link and skips notices and related-board promos', () => {
  const { extractLinks } = sourceLoader()('src/feature/article/listing.ts');
  const { document } = domFixture(`
    <div id="board_list">
      <table class="board_list_table"><tbody>
        <tr class="table_body notice"><td><a class="subject_link" href="/community/board/300143/read/1">공지</a></td></tr>
        <tr class="table_body other"><td><a class="subject_link" href="/game/board/123/read/2">다른 게시판</a></td></tr>
        <tr class="table_body gallery"><td>
          <a href="/community/board/300143/read/3?view=gallery"><div class="thumbnail"></div></a>
          <a href="https://m.ruliweb.com/community/board/300143/read/3?view=gallery"><span class="subject_link">갤러리 글</span></a>
        </td></tr>
      </tbody></table>
    </div>
  `);
  assert.deepEqual(extractLinks(document), ['/community/board/300143/read/3']);
});
