import assert from 'node:assert/strict';
import test from 'node:test';
import { domFixture } from './dom-fixture.mjs';
import { memoryStorage, sourceLoader, vaultFixture } from './source-loader.mjs';

function readingFixture(initial = {}) {
  const storage = memoryStorage(initial);
  const window = {
    location: {
      origin: 'https://bbs.ruliweb.com',
      href: 'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=session',
    },
    history: { replaceState() {} },
  };
  const load = sourceLoader({ globals: { localStorage: storage, window } });
  const READING_HISTORY_KEY = 'ruliFeed:readingHistory';
  const { ReadingHistory } = load('src/vault/reading-history.ts');
  return { storage, window, load, ReadingHistory, READING_HISTORY_KEY };
}

const entry = (path, title = '게시글') => ({
  path,
  title,
  channelName: '테스트 채널',
});
const session = (id, patch = {}) => ({
  id,
  label: '테스트 탐색',
  path: '/community/board/300143/read/100',
  searchQuery: '?q=검색&articleKey=old',
  articleList: [
    '/community/board/300143/read/101',
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
  ],
  isSeriesMode: true,
  isScrapMode: false,
  seriesChannels: ['community/board/300143', 'community/board/300149'],
  scrollY: 340,
  updatedAt: 1,
  ...patch,
});

function siteVisit(storage, history, article) {
  const records = JSON.parse(
    storage.getItem('rulifeed:recentArticles') || '[]',
  );
  storage.setItem(
    'rulifeed:recentArticles',
    JSON.stringify([
      { ...article, visitedAt: Date.now() + records.length },
      ...records.filter((record) => record.path !== article.path),
    ]),
  );
  history.reload();
}

test('adjacent navigation reuses scans and invalidates after visits, list, index and skip changes', () => {
  const { load, storage } = readingFixture({
    'rulifeed:recentArticles': JSON.stringify(
      Array.from({ length: 1000 }, (_, i) => ({
        path: `/community/board/300143/read/${i + 1001}`,
        title: '게시글',
        channelName: '게시판',
        visitedAt: (i + 1) * 1000,
      })),
    ),
  });
  const { VaultAdapter } = load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const list = [
    '/community/board/300143/read/100',
    ...Array.from(
      { length: 1001 },
      (_, i) => `/community/board/300143/read/${i + 1001}`,
    ),
  ];
  const vault = new VaultAdapter(
    new Store({ articleList: list, activeIndex: 0 }),
    { saveConfig() {} },
    vaultFixture().href,
  );
  try {
    vault.skipVisitedArticles = true;
    let lookups = 0;
    const original = vault.reading.hasVisited.bind(vault.reading);
    vault.reading.hasVisited = (path) => {
      lookups++;
      return original(path);
    };
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1001);
    assert.equal(lookups, 1001);
    for (let i = 0; i < 50; i++) assert.equal(vault.isNextPageActive(), true);
    assert.equal(lookups, 1001);
    siteVisit(
      storage,
      vault.reading,
      entry('/community/board/300143/read/2001'),
    );
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), -1);
    const exhaustedLookups = lookups;
    assert.equal(vault.isNextPageActive(), false);
    assert.equal(lookups, exhaustedLookups);
    vault.articleList = [...list, '/community/board/300143/read/2002'];
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1002);
    vault.activeIndex = 1002;
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), -1);
    assert.equal(vault.getAdjacentArticleIndex('PREV'), 1001);
    vault.activeIndex = 0;
    vault.skipVisitedArticles = false;
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1);
    vault.href = { ...vault.href, articleId: '1001' };
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 2);
  } finally {
    vault.destroy();
  }
});

test('reading search reuses normalized records while preserving multiword and Unicode matching', () => {
  const { createReadingSearchMatcher, matchesReadingSearch } = sourceLoader({})(
    'src/feature/modal/readingUi.ts',
  );
  let textReads = 0;
  const matcher = createReadingSearchMatcher((record) => {
    textReads++;
    return record.text;
  });
  const records = [
    { text: '  ＡＢＣ   테스트 채널 ' },
    { text: '다른 게시글' },
  ];
  assert.equal(matcher(records[0], ''), true);
  assert.equal(textReads, 0);
  for (const query of ['abc', '테스트 abc', '다른', '', '없는 검색', 'abc']) {
    for (const record of records)
      assert.equal(
        matcher(record, query),
        matchesReadingSearch(record.text, query),
      );
  }
  assert.equal(textReads, 2);
  assert.equal(matcher({ text: '수정된 제목' }, '수정된'), true);
  assert.equal(textReads, 3);
});

test('recent history reads stored visits and deduplicates article paths', () => {
  const { ReadingHistory, storage } = readingFixture({
    'rulifeed:recentArticles': JSON.stringify([
      {
        path: `/community/board/300143/read/${100}`,
        title: '수정된 제목',
        channelName: '테스트',
        visitedAt: 3 * 1000,
      },
      {
        path: `/community/board/300143/read/${'99'}`,
        title: '이전 글',
        channelName: '게시판',
        visitedAt: 2 * 1000,
      },
      {
        path: `/community/board/300143/read/${100}`,
        title: '게시글',
        channelName: '게시판',
        visitedAt: 1 * 1000,
      },
    ]),
  });
  const history = new ReadingHistory();
  assert.deepEqual(
    history.entries.map((item) => item.path),
    ['/community/board/300143/read/100', '/community/board/300143/read/99'],
  );
  assert.equal(history.entries[0].visitedAt, 3000);
  assert.equal(history.entries[0].title, '수정된 제목');
  assert.equal(history.entries[0].channelName, '테스트');
  assert.equal(history.hasVisited('/community/board/300147/read/100'), false);
  const { isVisitedPath } = readingFixture().load(
    'src/vault/reading-history.ts',
  );
  assert.equal(
    isVisitedPath(
      history.getVisitedPaths(),
      '/community/board/300143/read/100',
    ),
    true,
  );
  const paths = history.getVisitedPaths();
  paths.clear();
  assert.equal(history.hasVisited('/community/board/300143/read/100'), true);
  assert.equal(storage.writes.length, 0);
  history.saveSession(session('community/board/300146'));
  assert.ok(
    storage.writes.every(
      (write) =>
        ['ruliFeed:readingHistory', 'ruliFeed:readingProgress'].includes(
          write.key,
        ) || write.key.startsWith('ruliFeed:readingList:'),
    ),
  );
  assert.equal(
    'entries' in JSON.parse(storage.getItem('ruliFeed:readingHistory')),
    false,
  );
});

test('recent entries retain the latest 300 without changing native history or visited checks', () => {
  const records = Array.from({ length: 350 }, (_, index) => ({
    path: `/community/board/300143/read/${index + 1}`,
    title: '게시글',
    channelName: '게시판',
    visitedAt: (index + 1) * 1000,
  }));
  const original = JSON.stringify(records);
  const { ReadingHistory, storage } = readingFixture({
    'rulifeed:recentArticles': original,
  });
  const history = new ReadingHistory();
  assert.equal(history.entries.length, 300);
  assert.equal(history.entries[0].path, '/community/board/300143/read/350');
  assert.equal(history.entries.at(-1).path, '/community/board/300143/read/51');
  assert.equal(history.hasVisited('/community/board/300143/read/1'), true);
  assert.equal(storage.getItem('rulifeed:recentArticles'), original);
  assert.equal(storage.writes.length, 0);

  const previousEntries = history.entries;
  history.reload();
  assert.equal(history.entries, previousEntries);
  siteVisit(storage, history, entry('/community/board/300143/read/351'));
  assert.equal(history.entries.length, 300);
  assert.equal(history.entries[0].path, '/community/board/300143/read/351');
  assert.equal(history.entries.at(-1).path, '/community/board/300143/read/52');
});

test('native history reloads across tabs while checkpoint updates preserve other tabs positions', () => {
  const { ReadingHistory, storage } = readingFixture();
  const first = new ReadingHistory();
  const second = new ReadingHistory();
  siteVisit(storage, first, entry('/community/board/300143/read/100'));
  first.saveSession(session('series:first'));
  second.saveSession(session('series:second'));
  siteVisit(storage, first, entry('/community/board/300143/read/99'));
  second.reload();
  assert.deepEqual(
    second.entries.map((item) => item.path),
    ['/community/board/300143/read/99', '/community/board/300143/read/100'],
  );
  assert.deepEqual(
    second.sessions.map((item) => item.id),
    ['series:second', 'series:first'],
  );
  first.saveSession(session('series:first', { scrollY: 900 }));
  second.reload();
  assert.equal(second.sessions.length, 2);
  assert.equal(second.sessions[0].scrollY, 900);
});

test('clearing checkpoints preserves visits while clearing visits preserves checkpoints', () => {
  const { ReadingHistory, storage } = readingFixture();
  const history = new ReadingHistory();
  siteVisit(storage, history, entry('/community/board/300143/read/100'));
  history.saveSession(session('community/board/300146'));
  history.clear();
  assert.equal(history.hasVisited('/community/board/300143/read/100'), true);
  assert.deepEqual(history.sessions, []);
  history.saveSession(session('keep'));
  const visits = storage.getItem('rulifeed:recentArticles');
  storage.removeItem('rulifeed:recentArticles');
  history.reload();
  assert.deepEqual(history.entries, []);
  assert.equal(history.sessions.length, 1);
  storage.setItem('rulifeed:recentArticles', visits);
  history.reload();
  assert.equal(history.hasVisited('/community/board/300143/read/100'), true);
});

test('legacy duplicate visits are discarded while valid checkpoints survive migration', () => {
  const { ReadingHistory, storage, READING_HISTORY_KEY } = readingFixture();
  storage.setItem(
    READING_HISTORY_KEY,
    JSON.stringify({
      entries: [{ ...entry('/community/board/300143/read/100'), visitedAt: 1 }],
      sessions: [
        session('valid', {
          articleList: [
            '/community/board/300143/read/100',
            'https://example.com/community/board/300143/read/99',
          ],
          seriesChannels: ['community/board/300143', '../invalid'],
          scrollY: -50,
        }),
        session('external', {
          path: 'https://example.com/community/board/300143/read/99',
        }),
        session('bad-time', { updatedAt: 0 }),
      ],
    }),
  );
  const history = new ReadingHistory();
  assert.equal(history.hasVisited('/community/board/300143/read/100'), false);
  assert.deepEqual(history.entries, []);
  assert.equal(history.sessions.length, 1);
  assert.deepEqual(history.sessions[0].articleList, [
    '/community/board/300143/read/100',
  ]);
  assert.deepEqual(history.sessions[0].seriesChannels, [
    'community/board/300143',
  ]);
  assert.equal(history.sessions[0].scrollY, 0);
  assert.equal(
    new URLSearchParams(history.sessions[0].searchQuery).has('articleKey'),
    false,
  );
  assert.equal(
    'entries' in JSON.parse(storage.getItem(READING_HISTORY_KEY)),
    false,
  );
});

test('malformed native records are ignored and resume positions stay bounded', () => {
  const { ReadingHistory, storage, load, READING_HISTORY_KEY } = readingFixture(
    {
      'rulifeed:recentArticles': JSON.stringify([
        null,
        { slug: '../external', articleId: 100, regdateAt: 1 },
        {
          path: `/community/board/300143/read/${'bad'}`,
          title: '게시글',
          channelName: '게시판',
          visitedAt: 1 * 1000,
        },
        {
          path: `/community/board/300143/read/${100}`,
          title: '게시글',
          channelName: '게시판',
          visitedAt: -1 * 1000,
        },
      ]),
    },
  );
  const { SESSION_LIMIT } = load('src/vault/reading-history.ts');
  storage.setItem(
    READING_HISTORY_KEY,
    JSON.stringify({
      sessions: Array.from({ length: SESSION_LIMIT }, (_, index) =>
        session(`saved:${index}`),
      ),
    }),
  );
  const history = new ReadingHistory();
  assert.deepEqual(history.entries, []);
  history.saveSession(
    session('new', {
      articleList: Array.from(
        { length: 2100 },
        (_, index) => `/community/board/300143/read/${index + 1}`,
      ),
    }),
  );
  const reloaded = new ReadingHistory();
  assert.equal(reloaded.sessions.length, SESSION_LIMIT);
  assert.equal(reloaded.sessions[0].id, 'new');
  assert.equal(reloaded.sessions[0].articleList.length, 2000);
  storage.setItem('rulifeed:recentArticles', '{bad');
  reloaded.reload();
  assert.deepEqual(reloaded.entries, []);
});

test('next navigation skips seen articles while previous navigation remains available', () => {
  const { load, storage } = readingFixture();
  const { VaultAdapter } = load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const vault = new VaultAdapter(
    new Store({
      articleList: [
        '/community/board/300143/read/100',
        '/community/board/300143/read/99',
        '/community/board/300143/read/98',
        '/community/board/300143/read/97',
      ],
      activeIndex: 0,
    }),
    { saveConfig() {} },
    vaultFixture().href,
  );
  try {
    siteVisit(storage, vault.reading, entry('/community/board/300143/read/99'));
    siteVisit(storage, vault.reading, entry('/community/board/300143/read/98'));
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1);
    vault.skipVisitedArticles = true;
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 3);
    assert.equal(vault.isNextPageActive(), true);
    vault.activeIndex = 2;
    assert.equal(vault.getAdjacentArticleIndex('PREV'), 1);
    siteVisit(storage, vault.reading, entry('/community/board/300143/read/97'));
    assert.equal(vault.isNextPageActive(), false);
    storage.setItem('rulifeed:recentArticles', '[]');
    vault.reading.reload();
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 3);
  } finally {
    vault.destroy();
  }
});

test('resume restores session links, selected channels and search without changing the outgoing session', () => {
  const { load, storage, window } = readingFixture();
  const { VaultAdapter, ConfigService, StorageRepository } =
    load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const config = new ConfigService(new StorageRepository(storage));
  const vault = new VaultAdapter(
    new Store({
      articleKey: 'session',
      articleList: ['/community/board/300143/read/100'],
      activeIndex: 0,
    }),
    config,
    vaultFixture().href,
  );
  try {
    siteVisit(
      storage,
      vault.reading,
      entry('/community/board/300143/read/100'),
    );
    vault.restoreReadingSession(session('resume'), 'restored');
    assert.deepEqual(vault.articleList, ['/community/board/300143/read/100']);
    assert.equal(vault.articleKey, 'session');
    assert.deepEqual(
      JSON.parse(storage.getItem('ruliFeed:session:articleList')),
      ['/community/board/300143/read/100'],
    );
    window.location.href =
      'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=restored';
    const restored = config.loadConfig();
    assert.deepEqual(restored.articleList, [
      '/community/board/300143/read/101',
      '/community/board/300143/read/100',
      '/community/board/300143/read/99',
    ]);
    assert.equal(restored.lastActiveIndex, 1);
    assert.equal(restored.isSeriesMode, true);
    assert.deepEqual(restored.seriesChannels, [
      'community/board/300143',
      'community/board/300149',
    ]);
    const params = new URLSearchParams(restored.searchQuery);
    assert.equal(params.get('q'), '검색');
    assert.equal(params.get('articleKey'), 'restored');
    assert.equal(
      vault.reading.hasVisited('/community/board/300143/read/100'),
      true,
    );
  } finally {
    vault.destroy();
  }
});

test('history search waits for Korean composition, normalizes input and clears the query', () => {
  const dom = domFixture();
  const { readingSearch, matchesReadingSearch } = sourceLoader({
    globals: dom,
  })('src/feature/modal/readingUi.ts');
  let changes = 0;
  const search = readingSearch('검색', '검색', () => changes++);
  dom.document.body.append(search.element);
  const input = search.element.querySelector('input');
  const clear = search.element.querySelector('button');
  let focused = false;
  input.focus = () => {
    focused = true;
  };
  const dispatch = (type) => input.dispatchEvent(new dom.Event(type));
  assert.equal(input.getAttribute('autocomplete'), 'off');
  assert.equal(input.type, 'search');
  assert.equal(input.getAttribute('aria-label'), '검색');
  assert.equal(clear.hidden, true);
  dispatch('compositionstart');
  input.value = '테';
  dispatch('input');
  assert.equal(changes, 0);
  input.value = '테스트  ＡＢＣ';
  dispatch('compositionend');
  assert.equal(changes, 1);
  dispatch('input');
  assert.equal(changes, 1);
  assert.equal(
    matchesReadingSearch('abc 채널의 테스트 게시글', search.getQuery()),
    true,
  );
  assert.equal(matchesReadingSearch('테스트 게시글', search.getQuery()), false);
  assert.equal(clear.hidden, false);
  clear.click();
  assert.equal(search.getQuery(), '');
  assert.equal(input.value, '');
  assert.equal(focused, true);
  assert.equal(clear.hidden, true);
  assert.equal(changes, 2);
});

test('subscription feeds allow skipping while ordinary series and scrap preserve preferences', () => {
  const { load } = readingFixture({
    'rulifeed:recentArticles': JSON.stringify([
      {
        path: `/community/board/300143/read/${99}`,
        title: '게시글',
        channelName: '게시판',
        visitedAt: 1 * 1000,
      },
    ]),
  });
  const { VaultAdapter } = load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const vault = new VaultAdapter(
    new Store({
      articleKey: 'session',
      articleList: [
        '/community/board/300143/read/100',
        '/community/board/300143/read/99',
        '/community/board/300143/read/98',
      ],
      activeIndex: 0,
      uiSettings: {
        ...load('src/vault/store.ts').createInitialState().uiSettings,
        skipVisitedContexts: {
          'channel:community/board/300143': true,
          home: true,
          scrap: true,
          'series:session': true,
        },
      },
    }),
    { saveConfig() {} },
    vaultFixture().href,
  );
  try {
    const preferences = vault.uiSettings.skipVisitedContexts;
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 2);
    for (const mode of [
      { isSeriesMode: true, isScrapMode: false, seriesChannels: [] },
      {
        isSeriesMode: true,
        isScrapMode: true,
        seriesChannels: ['community/board/300143'],
      },
      { isSeriesMode: true, isScrapMode: true, seriesChannels: [] },
      { isSeriesMode: false, isScrapMode: true, seriesChannels: [] },
    ]) {
      vault.updateState(mode);
      assert.equal(vault.canSkipVisitedArticles, false);
      assert.equal(vault.skipVisitedArticles, false);
      assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1);
      vault.skipVisitedArticles = true;
      vault.skipVisitedArticles = false;
      assert.equal(vault.uiSettings.skipVisitedContexts, preferences);
    }
    vault.updateState({
      isSeriesMode: true,
      isScrapMode: false,
      seriesChannels: ['community/board/300143', 'community/board/300149'],
    });
    assert.equal(vault.canSkipVisitedArticles, true);
    assert.equal(vault.skipVisitedArticles, true);
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 2);
    vault.skipVisitedArticles = false;
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1);
    assert.equal(vault.uiSettings.skipVisitedContexts.home, false);
    assert.equal(
      vault.uiSettings.skipVisitedContexts['channel:community/board/300143'],
      true,
    );
    vault.href = { ...vault.href, mode: 'HOME', channelId: 'my' };
    assert.equal(vault.canSkipVisitedArticles, true);
    assert.equal(vault.skipVisitedArticles, false);
    vault.skipVisitedArticles = true;
    vault.href = {
      ...vaultFixture().href,
      channelId: 'community/board/300149',
    };
    assert.equal(vault.skipVisitedArticles, true);
    assert.equal(vault.uiSettings.skipVisitedContexts.home, true);
    vault.updateState({ isSeriesMode: false, isScrapMode: false });
    vault.href = { ...vault.href, mode: 'SCRAP' };
    assert.equal(vault.skipVisitedArticles, false);
    vault.skipVisitedArticles = true;
    assert.equal(vault.uiSettings.skipVisitedContexts.home, true);
    vault.href = vaultFixture().href;
    assert.equal(vault.canSkipVisitedArticles, true);
    assert.equal(vault.skipVisitedArticles, true);
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 2);
  } finally {
    vault.destroy();
  }
});

test('legacy global skip flags cannot enable unrelated contexts and malformed preferences are ignored', () => {
  const { load } = readingFixture();
  const { normalizeUISettings } = load('src/vault/config-schema.ts');
  const legacy = normalizeUISettings({
    skipVisitedArticles: true,
    skipReadArticles: true,
  });
  assert.deepEqual(legacy.skipVisitedContexts, {});
  const settings = normalizeUISettings({
    skipVisitedContexts: {
      'channel:community/board/300143': true,
      home: false,
      scrap: 'true',
      'series:abc123': true,
      invalid: true,
    },
  });
  assert.deepEqual(settings.skipVisitedContexts, {
    'channel:community/board/300143': true,
    home: false,
    'series:abc123': true,
  });
});

test('scrap checkpoints preserve their mode through history and navigation-cache restoration', () => {
  const { ReadingHistory, load, storage, window } = readingFixture();
  const history = new ReadingHistory();
  history.saveSession(
    session('series:scraps', {
      isScrapMode: true,
      seriesChannels: [],
      label: '스크랩',
    }),
  );
  const saved = new ReadingHistory().sessions[0];
  assert.equal(saved.isScrapMode, true);
  const { ConfigService, StorageRepository } = load('src/vault/index.ts');
  const config = new ConfigService(new StorageRepository(storage));
  config.restoreReadingSession(saved, 'restored');
  window.location.href =
    'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=restored';
  const restored = config.loadConfig();
  assert.equal(restored.isSeriesMode, true);
  assert.equal(restored.isScrapMode, true);
  assert.deepEqual(restored.seriesChannels, []);
  assert.deepEqual(restored.articleList, saved.articleList);
});

test('deleting one checkpoint keeps visits and other checkpoints in older tabs', () => {
  const { ReadingHistory, storage } = readingFixture();
  const first = new ReadingHistory();
  const second = new ReadingHistory();
  siteVisit(storage, first, entry('/community/board/300143/read/100'));
  first.saveSession(session('community/board/300146'));
  second.saveSession(session('community/board/300147'));
  first.removeSession('community/board/300146');
  second.reload();
  assert.deepEqual(
    second.sessions.map((item) => item.id),
    ['community/board/300147'],
  );
  assert.equal(second.hasVisited('/community/board/300143/read/100'), true);
  assert.deepEqual(
    new ReadingHistory().sessions.map((item) => item.id),
    ['community/board/300147'],
  );
});

for (const quickExit of [false, true])
  test(`deferred reading checkpoint preserves scroll and deletion (quick exit: ${quickExit})`, () => {
    const storage = memoryStorage();
    const listeners = new Map();
    const timers = new Map();
    let timerId = 0;
    const frames = new Map();
    let frameId = 0;
    let indicatorScans = 0;
    const window = {
      location: {
        origin: 'https://bbs.ruliweb.com',
        href: 'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=session',
      },
      scrollY: 120,
      addEventListener: (name, handler) => listeners.set(name, handler),
    };
    const load = sourceLoader({
      globals: {
        window,
        localStorage: storage,
        sessionStorage: { getItem: () => null },
        document: {
          title: '스크랩한 게시글',
          querySelector: () => null,
          addEventListener: (name, handler) => listeners.set(name, handler),
        },
        setTimeout: (handler, delay) => {
          timers.set(++timerId, { handler, delay });
          return timerId;
        },
        clearTimeout: (id) => timers.delete(id),
        requestAnimationFrame: (handler) => {
          frames.set(++frameId, handler);
          return frameId;
        },
        cancelAnimationFrame: (id) => frames.delete(id),
      },
      mocks: {
        './filter': {
          extractArticleRows: () => {
            indicatorScans++;
            return [];
          },
        },
        './article/link': { refreshUnvisitedNavigation() {} },
      },
    });
    const { VaultAdapter } = load('src/vault/index.ts');
    const { Store } = load('src/vault/store.ts');
    const { initReading } = load('src/feature/reading.ts');
    const vault = new VaultAdapter(
      new Store({
        articleKey: 'session',
        isSeriesMode: true,
        isScrapMode: true,
        articleList: ['/community/board/300143/read/100'],
      }),
      { saveConfig() {} },
      vaultFixture().href,
    );
    try {
      siteVisit(
        storage,
        vault.reading,
        entry('/community/board/300143/read/100'),
      );
      let fullCheckpoints = 0;
      const saveSession = vault.reading.saveSession.bind(vault.reading);
      vault.reading.saveSession = (checkpoint) => {
        fullCheckpoints++;
        saveSession(checkpoint);
      };
      initReading(vault);
      assert.equal(fullCheckpoints, 0);
      assert.equal(indicatorScans, 0);
      // Changes to another session must not cancel our first deferred save.
      saveSession(
        session('community/board/300149', {
          path: '/community/board/300149/read/1',
        }),
      );
      // A quick exit must persist before the deferred initial checkpoint runs.
      if (quickExit) listeners.get('pagehide')();
      assert.equal(fullCheckpoints, quickExit ? 1 : 0);
      for (const [id, handler] of [...frames]) {
        frames.delete(id);
        handler();
      }
      assert.equal(indicatorScans, 0);
      for (const timer of [...timers.values()])
        if (timer.delay === 0) timer.handler();
      assert.equal(fullCheckpoints, 1);
      assert.equal(indicatorScans, 1);
      assert.equal(vault.reading.sessions[0].isScrapMode, true);
      assert.equal(vault.reading.sessions[0].label, '스크랩');
      const initialScans = indicatorScans;
      storage.writes.length = 0;
      window.scrollY = 240;
      listeners.get('scroll')();
      for (const timer of [...timers.values()])
        if (timer.delay === 700) timer.handler();
      assert.equal(indicatorScans, initialScans);
      assert.equal(fullCheckpoints, 1);
      assert.deepEqual(
        storage.writes.map((write) => write.key),
        ['ruliFeed:readingProgress'],
      );
      // Continuous scroll still checkpoints at the maximum wait deadline.
      storage.writes.length = 0;
      for (let index = 0; index < 10; index++) {
        window.scrollY += 10;
        listeners.get('scroll')();
      }
      const deadlines = [...timers.values()].filter(
        (timer) => timer.delay === 5000,
      );
      assert.equal(deadlines.length, 1);
      deadlines[0].handler();
      assert.equal(fullCheckpoints, 1);
      assert.deepEqual(
        storage.writes.map((write) => write.key),
        ['ruliFeed:readingProgress'],
      );
      storage.writes.length = 0;
      listeners.get('pagehide')();
      assert.equal(storage.writes.length, 0);
      assert.equal(fullCheckpoints, 1);
      vault.articleList = [
        '/community/board/300143/read/100',
        '/community/board/300143/read/99',
      ];
      listeners.get('pagehide')();
      assert.equal(fullCheckpoints, 2);
      assert.deepEqual(
        vault.reading.sessions[0].articleList,
        vault.articleList,
      );
      vault.activeIndex = 0;
      vault.uiSettings = { ...vault.uiSettings, lastModalTab: 'resume' };
      assert.equal(indicatorScans, initialScans);
      vault.reading.removeSession('series:session');
      listeners.get('scroll')();
      for (const timer of [...timers.values()])
        if (timer.delay === 700) timer.handler();
      listeners.get('pagehide')();
      assert.deepEqual(
        vault.reading.sessions.map(({ id }) => id),
        ['community/board/300149'],
      );
      assert.equal(
        vault.reading.hasVisited('/community/board/300143/read/100'),
        true,
      );
    } finally {
      vault.destroy();
    }
  });

test('scroll checkpoints write only small progress data and notify only progress listeners', () => {
  const { ReadingHistory, storage } = readingFixture();
  const READING_PROGRESS_KEY = 'ruliFeed:readingProgress';
  const history = new ReadingHistory();
  const checkpoint = session('large', {
    articleList: Array.from(
      { length: 2000 },
      (_, i) => `/community/board/300143/read/${i + 1}`,
    ),
  });
  history.saveSession(checkpoint);
  const contexts = storage.getItem('ruliFeed:readingHistory');
  const links = storage.getItem('ruliFeed:readingList:large');
  let contextsChanged = 0;
  let visitsChanged = 0;
  let progressChanged = 0;
  history.subscribe(() => contextsChanged++, ['sessions']);
  history.subscribe(() => visitsChanged++, ['entries']);
  history.subscribe(() => progressChanged++, ['progress']);
  storage.writes.length = 0;
  history.saveSession({ ...checkpoint, scrollY: 950, updatedAt: 2 });
  assert.deepEqual(
    storage.writes.map((write) => write.key),
    [READING_PROGRESS_KEY],
  );
  assert.ok(storage.writes[0].value.length < links.length / 10);
  assert.equal(storage.getItem('ruliFeed:readingList:large'), links);
  assert.equal(storage.getItem('ruliFeed:readingHistory'), contexts);
  assert.equal(contextsChanged, 0);
  assert.equal(visitsChanged, 0);
  assert.equal(progressChanged, 1);
  assert.equal(new ReadingHistory().sessions[0].scrollY, 950);
  storage.writes.length = 0;
  history.saveSession({ ...checkpoint, scrollY: 950, updatedAt: 3 });
  history.reload();
  assert.equal(storage.writes.length, 0);
  assert.equal(progressChanged, 1);
});

test('position-only checkpoints merge other tabs and reject changed or deleted contexts', () => {
  const { ReadingHistory, storage } = readingFixture();
  const history = new ReadingHistory();
  const first = session('community/board/300146');
  const second = session('community/board/300147', {
    path: '/community/board/300143/read/99',
  });
  history.saveSession(second);
  history.saveSession(first);
  const other = new ReadingHistory();
  other.saveSession({ ...second, scrollY: 900, updatedAt: 2 });
  storage.writes.length = 0;
  assert.equal(
    history.savePosition('community/board/300146', first.path, 500, 3),
    true,
  );
  assert.deepEqual(
    storage.writes.map((item) => item.key),
    ['ruliFeed:readingProgress'],
  );
  assert.equal(
    history.sessions.find((item) => item.id === 'community/board/300147')
      .scrollY,
    900,
  );
  storage.writes.length = 0;
  assert.equal(
    history.savePosition('community/board/300146', first.path, 500, 4),
    true,
  );
  assert.equal(storage.writes.length, 0);
  assert.equal(
    history.savePosition(
      'community/board/300146',
      '/community/board/300143/read/98',
      500,
      4,
    ),
    false,
  );
  other.saveSession({ ...first, label: '다른 탭에서 바뀐 탐색', updatedAt: 5 });
  storage.writes.length = 0;
  assert.equal(
    history.savePosition('community/board/300146', first.path, 600, 6),
    false,
  );
  assert.equal(storage.writes.length, 0);
  history.saveSession({ ...first, scrollY: 600, updatedAt: 6 });
  other.removeSession('community/board/300146');
  assert.equal(
    history.savePosition('community/board/300146', first.path, 700, 7),
    false,
  );
});

test('legacy oversized resume lists migrate within a total budget and retain every current article', () => {
  const { ReadingHistory, storage, load } = readingFixture();
  const { SESSION_TOTAL_ARTICLE_LIMIT } = load('src/vault/reading-history.ts');
  storage.setItem(
    'ruliFeed:readingHistory',
    JSON.stringify({
      sessions: Array.from({ length: 20 }, (_, index) =>
        session(`old:${index}`, {
          path: `/community/board/300143/read/${4000 + index}`,
          articleList: Array.from(
            { length: 4100 },
            (_, i) => `/community/board/300143/read/${i + 1}`,
          ),
        }),
      ),
    }),
  );
  const history = new ReadingHistory();
  void history.sessions; // Legacy migration runs on first resume access.
  const stored = JSON.parse(storage.getItem('ruliFeed:readingHistory'));
  assert.equal(stored.sessions.length, 20);
  assert.ok(
    stored.sessions.reduce((total, item) => total + item.articleCount, 0) <=
      SESSION_TOTAL_ARTICLE_LIMIT,
  );
  for (const item of stored.sessions) {
    assert.equal('articleList' in item, false);
    const list = JSON.parse(
      storage.getItem(`ruliFeed:readingList:${encodeURIComponent(item.id)}`),
    );
    assert.ok(list.includes(item.path));
  }
  for (const item of history.sessions)
    assert.ok(item.articleList.includes(item.path));
  storage.writes.length = 0;
  new ReadingHistory();
  assert.equal(storage.writes.length, 0);
});

test('progress from another tab preserves both sessions and removing a session also removes its progress', () => {
  const { ReadingHistory, storage } = readingFixture();
  const first = new ReadingHistory();
  const second = new ReadingHistory();
  first.saveSession(session('community/board/300146', { updatedAt: 1 }));
  second.saveSession(session('community/board/300147', { updatedAt: 2 }));
  first.saveSession(
    session('community/board/300146', { scrollY: 700, updatedAt: 3 }),
  );
  second.saveSession(
    session('community/board/300147', { scrollY: 800, updatedAt: 4 }),
  );
  first.reload();
  assert.deepEqual(
    first.sessions.map((item) => [item.id, item.scrollY]),
    [
      ['community/board/300147', 800],
      ['community/board/300146', 700],
    ],
  );
  first.removeSession('community/board/300146');
  const progress = JSON.parse(storage.getItem('ruliFeed:readingProgress'));
  assert.deepEqual(
    progress.map((item) => item.id),
    ['community/board/300147'],
  );
  second.reload();
  assert.equal(second.sessions[0].scrollY, 800);
});

test('reading progress and native visit reloads do not schedule config autosaves', () => {
  const storage = memoryStorage();
  let timers = 0;
  const load = sourceLoader({
    globals: {
      localStorage: storage,
      window: { location: { origin: 'https://bbs.ruliweb.com' } },
      setTimeout() {
        timers++;
        return timers;
      },
      clearTimeout() {},
    },
  });
  const { VaultAdapter } = load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const vault = new VaultAdapter(
    new Store(),
    { saveConfig() {} },
    vaultFixture().href,
  );
  try {
    let notifications = 0;
    vault.subscribe(() => notifications++);
    vault.reading.saveSession(session('community/board/300146'));
    vault.reading.saveSession(
      session('community/board/300146', { scrollY: 500, updatedAt: 2 }),
    );
    assert.equal(notifications, 0);
    siteVisit(
      storage,
      vault.reading,
      entry('/community/board/300143/read/100'),
    );
    assert.equal(notifications, 1);
    assert.equal(timers, 0);
    vault.activeIndex = 1;
    assert.equal(timers, 1);
  } finally {
    vault.destroy();
  }
});

test('resume summaries and existence checks read no article lists; selecting one loads only its list', () => {
  const { storage, ReadingHistory, window } = readingFixture();
  const writer = new ReadingHistory();
  writer.saveSession(
    session('community/board/300146', {
      articleList: [
        '/community/board/300143/read/100',
        '/community/board/300143/read/99',
      ],
    }),
  );
  writer.saveSession(
    session('community/board/300147', {
      articleList: [
        '/community/board/300143/read/100',
        '/community/board/300143/read/98',
      ],
    }),
  );
  const reads = [];
  const getItem = storage.getItem.bind(storage);
  storage.getItem = (key) => {
    reads.push(key);
    return getItem(key);
  };
  const { ReadingHistory: Reader } = sourceLoader({
    globals: { localStorage: storage, window },
  })('src/vault/reading-history.ts');
  const reader = new Reader();
  assert.equal(reader.hasSession('community/board/300146'), true);
  assert.ok(reads.every((key) => key === 'ruliFeed:readingHistory'));
  const summaries = reader.sessions;
  assert.equal(summaries.length, 2);
  assert.ok(reads.every((key) => !key.startsWith('ruliFeed:readingList:')));
  reads.length = 0;
  const first = summaries.find((item) => item.id === 'community/board/300146');
  assert.deepEqual(first.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
  ]);
  assert.ok(
    reads.every(
      (key) => key === 'ruliFeed:readingList:community%2Fboard%2F300146',
    ),
  );
  reads.length = 0;
  void first.articleList;
  assert.deepEqual(reads, []);
});

test('targeted history refreshes never read unrelated storage payloads', () => {
  const { storage, ReadingHistory } = readingFixture();
  const history = new ReadingHistory();
  history.saveSession(session('community/board/300146'));
  void history.entries;
  const reads = [];
  const getItem = storage.getItem.bind(storage);
  storage.getItem = (key) => {
    reads.push(key);
    return getItem(key);
  };
  history.reload(['entries']);
  assert.ok(
    reads.every((key) =>
      ['rulifeed:recentArticles', 'recent_disabled'].includes(key),
    ),
  );
  reads.length = 0;
  history.reload(['progress']);
  assert.deepEqual(reads, ['ruliFeed:readingProgress']);
  reads.length = 0;
  history.reload(['sessions']);
  assert.ok(
    reads.every((key) =>
      ['ruliFeed:readingHistory', 'ruliFeed:readingProgress'].includes(key),
    ),
  );
});

test('saving and removing one resumed context leaves other session lists unloaded', () => {
  const { storage, ReadingHistory, window } = readingFixture();
  const writer = new ReadingHistory();
  writer.saveSession(session('community/board/300146'));
  writer.saveSession(session('community/board/300147'));
  const reads = [];
  const getItem = storage.getItem.bind(storage);
  storage.getItem = (key) => {
    reads.push(key);
    return getItem(key);
  };
  const { ReadingHistory: Reader } = sourceLoader({
    globals: { localStorage: storage, window },
  })('src/vault/reading-history.ts');
  const reader = new Reader();
  reader.saveSession(
    session('community/board/300146', {
      articleList: [
        '/community/board/300143/read/100',
        '/community/board/300143/read/99',
      ],
    }),
  );
  assert.ok(!reads.includes('ruliFeed:readingList:community%2Fboard%2F300147'));
  reads.length = 0;
  reader.removeSession('community/board/300146');
  assert.ok(reads.every((key) => !key.startsWith('ruliFeed:readingList:')));
  assert.equal(
    storage.getItem('ruliFeed:readingList:community%2Fboard%2F300146'),
    null,
  );
  assert.notEqual(
    storage.getItem('ruliFeed:readingList:community%2Fboard%2F300147'),
    null,
  );
});

test('cross-tab list changes invalidate deferred lists without loading other lists', () => {
  const { storage, ReadingHistory } = readingFixture();
  const writer = new ReadingHistory();
  writer.saveSession(session('community/board/300146'));
  writer.saveSession(session('community/board/300147'));
  const reader = new ReadingHistory();
  const first = reader.sessions.find(
    (item) => item.id === 'community/board/300146',
  );
  void first.articleList;
  const updated = [
    '/community/board/300143/read/100',
    '/community/board/300143/read/77',
  ];
  storage.setItem(
    'ruliFeed:readingList:community%2Fboard%2F300146',
    JSON.stringify(updated),
  );
  reader.reloadSessionList();
  assert.deepEqual(
    reader.sessions.find((item) => item.id === 'community/board/300146')
      .articleList,
    updated,
  );
});

test('malformed split-list metadata stays bounded and missing lists retain the current article', () => {
  const contexts = Array.from({ length: 20 }, (_, index) => ({
    ...session(`bounded:${index}`),
    articleCount: 2000,
  }));
  const { storage, ReadingHistory, load } = readingFixture({
    'ruliFeed:readingHistory': JSON.stringify({
      version: 2,
      sessions: contexts,
    }),
  });
  const readingListKey = (id) =>
    `ruliFeed:readingList:${encodeURIComponent(id)}`;
  const { SESSION_TOTAL_ARTICLE_LIMIT } = load('src/vault/reading-history.ts');
  const links = Array.from(
    { length: 2100 },
    (_, i) => `/community/board/300143/read/${i + 1}`,
  );
  for (const context of contexts)
    storage.setItem(readingListKey(context.id), JSON.stringify(links));
  const history = new ReadingHistory();
  assert.ok(
    history.sessions.reduce(
      (total, item) => total + item.articleList.length,
      0,
    ) <= SESSION_TOTAL_ARTICLE_LIMIT,
  );
  const id = history.sessions[0].id;
  storage.removeItem(readingListKey(id));
  history.reloadSessionList();
  assert.deepEqual(
    history.sessions.find((item) => item.id === id).articleList,
    ['/community/board/300143/read/100'],
  );
});

test('cleared visits are read lazily and storage refresh loads new visits', () => {
  const { storage, ReadingHistory } = readingFixture();
  const reading = new ReadingHistory();
  assert.deepEqual(reading.entries, []);
  siteVisit(storage, reading, entry('/community/board/300143/read/100'));
  assert.equal(reading.hasVisited('/community/board/300143/read/100'), true);
});
