import assert from 'node:assert/strict';
import test from 'node:test';
import { memoryStorage, sourceLoader, vaultFixture } from './source-loader.mjs';

function readingFixture(initial = {}) {
  const storage = memoryStorage(initial);
  const window = {
    location: {
      origin: 'https://arca.live',
      href: 'https://arca.live/b/test/100?articleKey=session',
    },
    history: { replaceState() {} },
  };
  const load = sourceLoader({ globals: { localStorage: storage, window } });
  const { ReadingHistory, READING_HISTORY_KEY } = load(
    'src/vault/reading-history.ts',
  );
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
  path: '/b/test/100',
  searchQuery: '?q=검색&articleKey=old',
  articleList: ['/b/test/101', '/b/test/100', '/b/test/99'],
  isSeriesMode: true,
  isScrapMode: false,
  seriesChannels: ['test', 'other'],
  scrollY: 340,
  updatedAt: 1,
  ...patch,
});

function siteVisit(storage, history, article) {
  const records = JSON.parse(storage.getItem('recent_articles') || '[]');
  const [, , slug, articleId] = article.path.split('/');
  storage.setItem(
    'recent_articles',
    JSON.stringify([
      {
        slug,
        articleId,
        title: article.title,
        boardName: article.channelName,
        regdateAt: Date.now() / 1000 + records.length,
      },
      ...records.filter((record) => String(record.articleId) !== articleId),
    ]),
  );
  history.reload();
}

test('adjacent navigation reuses scans and invalidates after visits, list, index and skip changes', () => {
  const { load, storage } = readingFixture({
    recent_articles: JSON.stringify(
      Array.from({ length: 1000 }, (_, i) => ({
        slug: 'test',
        articleId: i + 1001,
        regdateAt: i + 1,
      })),
    ),
  });
  const { VaultAdapter } = load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const list = [
    '/b/test/100',
    ...Array.from({ length: 1001 }, (_, i) => `/b/test/${i + 1001}`),
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
    siteVisit(storage, vault.reading, entry('/b/test/2001'));
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), -1);
    const exhaustedLookups = lookups;
    assert.equal(vault.isNextPageActive(), false);
    assert.equal(lookups, exhaustedLookups);
    vault.articleList = [...list, '/b/test/2002'];
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
  const { createReadingSearchMatcher, matchesReadingSearch } = sourceLoader({
    mocks: { jquery: { default: () => {} } },
  })('src/feature/modal/readingUi.ts');
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

test('recent history reads native records and matches subscription-feed aliases without writing a duplicate list', () => {
  const { ReadingHistory, storage } = readingFixture({
    recent_articles: JSON.stringify([
      {
        slug: 'test',
        articleId: 100,
        title: '수정된 제목',
        boardName: '테스트',
        regdateAt: 3,
      },
      { slug: 'test', articleId: '99', title: '이전 글', regdateAt: 2 },
      { slug: 'test', articleId: 100, regdateAt: 1 },
    ]),
  });
  const history = new ReadingHistory();
  assert.deepEqual(
    history.entries.map((item) => item.path),
    ['/b/test/100', '/b/test/99'],
  );
  assert.equal(history.entries[0].visitedAt, 3000);
  assert.equal(history.entries[0].title, '수정된 제목');
  assert.equal(history.entries[0].channelName, '테스트');
  assert.equal(history.hasVisited('/b/my/100'), true);
  const { isVisitedPath } = readingFixture().load(
    'src/vault/reading-history.ts',
  );
  assert.equal(isVisitedPath(history.getVisitedPaths(), '/b/test/100'), true);
  const paths = history.getVisitedPaths();
  paths.clear();
  assert.equal(history.hasVisited('/b/test/100'), true);
  assert.equal(storage.writes.length, 0);
  history.saveSession(session('first'));
  assert.ok(
    storage.writes.every((write) =>
      ['arcaFeed:readingHistory', 'arcaFeed:readingProgress'].includes(
        write.key,
      ),
    ),
  );
  assert.equal(
    'entries' in JSON.parse(storage.getItem('arcaFeed:readingHistory')),
    false,
  );
});

test('native history reloads across tabs while checkpoint updates preserve other tabs positions', () => {
  const { ReadingHistory, storage } = readingFixture();
  const first = new ReadingHistory();
  const second = new ReadingHistory();
  siteVisit(storage, first, entry('/b/test/100'));
  first.saveSession(session('series:first'));
  second.saveSession(session('series:second'));
  siteVisit(storage, first, entry('/b/test/99'));
  second.reload();
  assert.deepEqual(
    second.entries.map((item) => item.path),
    ['/b/test/99', '/b/test/100'],
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

test('clearing checkpoints preserves native visits, while disabling native history clears only the seen view', () => {
  const { ReadingHistory, storage } = readingFixture();
  const history = new ReadingHistory();
  siteVisit(storage, history, entry('/b/test/100'));
  history.saveSession(session('first'));
  history.clear();
  assert.equal(history.hasVisited('/b/test/100'), true);
  assert.deepEqual(history.sessions, []);
  history.saveSession(session('keep'));
  storage.setItem('recent_disabled', '1');
  history.reload();
  assert.deepEqual(history.entries, []);
  assert.equal(history.sessions.length, 1);
  storage.removeItem('recent_disabled');
  history.reload();
  assert.equal(history.hasVisited('/b/test/100'), true);
});

test('legacy duplicate visits are discarded while valid checkpoints survive migration', () => {
  const { ReadingHistory, storage, READING_HISTORY_KEY } = readingFixture();
  storage.setItem(
    READING_HISTORY_KEY,
    JSON.stringify({
      entries: [{ ...entry('/b/test/100'), visitedAt: 1 }],
      sessions: [
        session('valid', {
          articleList: ['/b/test/100', 'https://example.com/b/test/99'],
          seriesChannels: ['test', '../invalid'],
          scrollY: -50,
        }),
        session('external', { path: 'https://example.com/b/test/99' }),
        session('bad-time', { updatedAt: 0 }),
      ],
    }),
  );
  const history = new ReadingHistory();
  assert.equal(history.hasVisited('/b/test/100'), false);
  assert.deepEqual(history.entries, []);
  assert.equal(history.sessions.length, 1);
  assert.deepEqual(history.sessions[0].articleList, ['/b/test/100']);
  assert.deepEqual(history.sessions[0].seriesChannels, ['test']);
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
      recent_articles: JSON.stringify([
        null,
        { slug: '../external', articleId: 100, regdateAt: 1 },
        { slug: 'test', articleId: 'bad', regdateAt: 1 },
        { slug: 'test', articleId: 100, regdateAt: -1 },
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
        (_, index) => `/b/test/${index + 1}`,
      ),
    }),
  );
  const reloaded = new ReadingHistory();
  assert.equal(reloaded.sessions.length, SESSION_LIMIT);
  assert.equal(reloaded.sessions[0].id, 'new');
  assert.equal(reloaded.sessions[0].articleList.length, 2000);
  storage.setItem('recent_articles', '{bad');
  reloaded.reload();
  assert.deepEqual(reloaded.entries, []);
});

test('next navigation skips seen articles while previous navigation remains available', () => {
  const { load, storage } = readingFixture();
  const { VaultAdapter } = load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const vault = new VaultAdapter(
    new Store({
      articleList: ['/b/test/100', '/b/test/99', '/b/test/98', '/b/test/97'],
      activeIndex: 0,
    }),
    { saveConfig() {} },
    vaultFixture().href,
  );
  try {
    siteVisit(storage, vault.reading, entry('/b/test/99'));
    siteVisit(storage, vault.reading, entry('/b/test/98'));
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1);
    vault.skipVisitedArticles = true;
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 3);
    assert.equal(vault.isNextPageActive(), true);
    vault.activeIndex = 2;
    assert.equal(vault.getAdjacentArticleIndex('PREV'), 1);
    siteVisit(storage, vault.reading, entry('/b/test/97'));
    assert.equal(vault.isNextPageActive(), false);
    storage.setItem('recent_articles', '[]');
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
      articleList: ['/b/test/100'],
      activeIndex: 0,
    }),
    config,
    vaultFixture().href,
  );
  try {
    siteVisit(storage, vault.reading, entry('/b/test/100'));
    vault.restoreReadingSession(session('resume'), 'restored');
    assert.deepEqual(vault.articleList, ['/b/test/100']);
    assert.equal(vault.articleKey, 'session');
    assert.deepEqual(
      JSON.parse(storage.getItem('arcaFeed:session:articleList')),
      ['/b/test/100'],
    );
    window.location.href = 'https://arca.live/b/test/100?articleKey=restored';
    const restored = config.loadConfig();
    assert.deepEqual(restored.articleList, [
      '/b/test/101',
      '/b/test/100',
      '/b/test/99',
    ]);
    assert.equal(restored.lastActiveIndex, 1);
    assert.equal(restored.isSeriesMode, true);
    assert.deepEqual(restored.seriesChannels, ['test', 'other']);
    const params = new URLSearchParams(restored.searchQuery);
    assert.equal(params.get('q'), '검색');
    assert.equal(params.get('articleKey'), 'restored');
    assert.equal(vault.reading.hasVisited('/b/test/100'), true);
  } finally {
    vault.destroy();
  }
});

test('history search avoids autocomplete plugin dispatch, waits for Korean composition and clears the query', () => {
  const elements = [];
  const jquery = (tag, props = {}) => {
    const element = {
      tag,
      value: '',
      attributes: {},
      handlers: new Map(),
      children: [],
      autocomplete(method) {
        throw new Error(
          `cannot call methods on autocomplete prior to initialization; attempted to call method '${method}'`,
        );
      },
      on(event, handler) {
        this.handlers.set(event, handler);
        return this;
      },
      addClass() {
        return this;
      },
      attr(attributes) {
        Object.assign(this.attributes, attributes);
        return this;
      },
      hide() {
        return this;
      },
      toggle() {
        return this;
      },
      append(...children) {
        this.children.push(...children);
        return this;
      },
      val(value) {
        if (value === undefined) return this.value;
        this.value = value;
        return this;
      },
      trigger(event) {
        this.handlers.get(event)?.();
        this.lastEvent = event;
        return this;
      },
    };
    // jQuery's single-tag constructor calls matching methods before setting attributes.
    for (const [name, value] of Object.entries(props)) {
      if (typeof element[name] === 'function') element[name](value);
      else element.attr({ [name]: value });
    }
    elements.push(element);
    return element;
  };
  const { readingSearch, matchesReadingSearch } = sourceLoader({
    mocks: { jquery: { default: jquery } },
  })('src/feature/modal/readingUi.ts');
  let changes = 0;
  const search = readingSearch('검색', '검색', () => changes++);
  const input = elements.find((element) => element.tag === '<input>');
  const clear = elements.find((element) => element.tag === '<button>');
  assert.equal(input.attributes.autocomplete, 'off');
  assert.equal(input.attributes.type, 'search');
  assert.equal(input.attributes['aria-label'], '검색');
  input.trigger('compositionstart');
  input.val('테').trigger('input');
  assert.equal(changes, 0);
  input.val('테스트  ＡＢＣ').trigger('compositionend');
  assert.equal(changes, 1);
  input.trigger('input');
  assert.equal(changes, 1);
  assert.equal(
    matchesReadingSearch('abc 채널의 테스트 게시글', search.getQuery()),
    true,
  );
  assert.equal(matchesReadingSearch('테스트 게시글', search.getQuery()), false);
  clear.trigger('click');
  assert.equal(search.getQuery(), '');
  assert.equal(input.val(), '');
  assert.equal(input.lastEvent, 'focus');
  assert.equal(changes, 2);
});

test('skip preferences stay independent for channels, home, scraps and individual series after reload', () => {
  const { load, storage, window } = readingFixture();
  const { VaultAdapter, ConfigService, StorageRepository } =
    load('src/vault/index.ts');
  const { Store } = load('src/vault/store.ts');
  const config = new ConfigService(new StorageRepository(storage));
  const vault = new VaultAdapter(
    new Store({ articleKey: 'session' }),
    config,
    vaultFixture().href,
  );
  try {
    vault.skipVisitedArticles = true;
    vault.href = { ...vault.href, channelId: 'other' };
    assert.equal(vault.skipVisitedArticles, false);
    vault.skipVisitedArticles = false;
    vault.href = { ...vault.href, channelId: 'test' };
    assert.equal(vault.skipVisitedArticles, true);
    vault.updateState({
      isSeriesMode: true,
      seriesChannels: ['test', 'other'],
    });
    assert.equal(vault.skipVisitedArticles, false);
    vault.skipVisitedArticles = true;
    vault.href = { ...vault.href, channelId: 'other' };
    assert.equal(vault.skipVisitedArticles, true);
    vault.updateState({ isScrapMode: true, seriesChannels: [] });
    assert.equal(vault.skipVisitedArticles, false);
    vault.skipVisitedArticles = true;
    vault.updateState({ isScrapMode: false });
    assert.equal(vault.skipVisitedArticles, false);
    vault.skipVisitedArticles = true;
    vault.articleKey = 'another-series';
    assert.equal(vault.skipVisitedArticles, false);
    vault.articleKey = 'session';
    assert.equal(vault.skipVisitedArticles, true);
    vault.flushSave();
    window.location.href = 'https://arca.live/b/test/100?articleKey=session';
    const reloaded = new VaultAdapter(
      new Store(config.loadConfig()),
      config,
      vaultFixture().href,
    );
    try {
      assert.equal(reloaded.skipVisitedArticles, true);
      reloaded.updateState({ isScrapMode: true });
      assert.equal(reloaded.skipVisitedArticles, true);
      reloaded.skipVisitedArticles = false;
      reloaded.updateState({ isScrapMode: false, seriesChannels: ['test'] });
      assert.equal(reloaded.skipVisitedArticles, true);
      reloaded.updateState({ isSeriesMode: false, seriesChannels: [] });
      assert.equal(reloaded.skipVisitedArticles, true);
    } finally {
      reloaded.destroy();
    }
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
      'channel:test': true,
      home: false,
      scrap: 'true',
      'series:abc123': true,
      invalid: true,
    },
  });
  assert.deepEqual(settings.skipVisitedContexts, {
    'channel:test': true,
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
  window.location.href = 'https://arca.live/b/test/100?articleKey=restored';
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
  siteVisit(storage, first, entry('/b/test/100'));
  first.saveSession(session('first'));
  second.saveSession(session('second'));
  first.removeSession('first');
  second.reload();
  assert.deepEqual(
    second.sessions.map((item) => item.id),
    ['second'],
  );
  assert.equal(second.hasVisited('/b/test/100'), true);
  assert.deepEqual(
    new ReadingHistory().sessions.map((item) => item.id),
    ['second'],
  );
});

test('deleting the current checkpoint prevents scroll and pagehide from recreating it', () => {
  const storage = memoryStorage();
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  let indicatorScans = 0;
  const window = {
    location: {
      origin: 'https://arca.live',
      href: 'https://arca.live/b/test/100?articleKey=session',
    },
    scrollY: 120,
    addEventListener: (name, handler) => listeners.set(name, handler),
  };
  const chain = {
    length: 0,
    first() {
      return this;
    },
    text() {
      return '';
    },
    find() {
      return this;
    },
    each() {
      return this;
    },
    toggleClass() {
      return this;
    },
    attr() {
      return this;
    },
    on() {
      return this;
    },
  };
  const load = sourceLoader({
    globals: {
      window,
      localStorage: storage,
      sessionStorage: { getItem: () => null },
      document: {
        title: '스크랩한 게시글',
        addEventListener: (name, handler) => listeners.set(name, handler),
      },
      setTimeout: (handler, delay) => {
        timers.set(++timerId, { handler, delay });
        return timerId;
      },
      clearTimeout: (id) => timers.delete(id),
    },
    mocks: {
      jquery: { default: () => chain },
      './filter': {
        extractArticleRows: () => {
          indicatorScans++;
          return chain;
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
      articleList: ['/b/test/100'],
    }),
    { saveConfig() {} },
    vaultFixture().href,
  );
  try {
    siteVisit(storage, vault.reading, entry('/b/test/100'));
    initReading(vault);
    assert.equal(vault.reading.sessions[0].isScrapMode, true);
    assert.equal(vault.reading.sessions[0].label, '스크랩');
    const initialScans = indicatorScans;
    storage.writes.length = 0;
    window.scrollY = 240;
    listeners.get('scroll')();
    for (const timer of [...timers.values()])
      if (timer.delay === 700) timer.handler();
    assert.equal(indicatorScans, initialScans);
    assert.deepEqual(
      storage.writes.map((write) => write.key),
      ['arcaFeed:readingProgress'],
    );
    storage.writes.length = 0;
    listeners.get('pagehide')();
    assert.equal(storage.writes.length, 0);
    vault.activeIndex = 0;
    vault.uiSettings = { ...vault.uiSettings, lastModalTab: 'resume' };
    assert.equal(indicatorScans, initialScans);
    vault.reading.removeSession('series:session');
    listeners.get('scroll')();
    for (const timer of [...timers.values()])
      if (timer.delay === 700) timer.handler();
    listeners.get('pagehide')();
    assert.deepEqual(vault.reading.sessions, []);
    assert.equal(vault.reading.hasVisited('/b/test/100'), true);
  } finally {
    vault.destroy();
  }
});

test('scroll checkpoints write only small progress data and notify only progress listeners', () => {
  const { ReadingHistory, storage, load } = readingFixture();
  const { READING_PROGRESS_KEY } = load('src/vault/reading-history.ts');
  const history = new ReadingHistory();
  const checkpoint = session('large', {
    articleList: Array.from({ length: 2000 }, (_, i) => `/b/test/${i + 1}`),
  });
  history.saveSession(checkpoint);
  const contexts = storage.getItem('arcaFeed:readingHistory');
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
  assert.ok(storage.writes[0].value.length < contexts.length / 10);
  assert.equal(storage.getItem('arcaFeed:readingHistory'), contexts);
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

test('legacy oversized resume lists migrate within a total budget and retain every current article', () => {
  const { ReadingHistory, storage, load } = readingFixture();
  const { SESSION_TOTAL_ARTICLE_LIMIT } = load('src/vault/reading-history.ts');
  storage.setItem(
    'arcaFeed:readingHistory',
    JSON.stringify({
      sessions: Array.from({ length: 20 }, (_, index) =>
        session(`old:${index}`, {
          path: `/b/test/${4000 + index}`,
          articleList: Array.from(
            { length: 4100 },
            (_, i) => `/b/test/${i + 1}`,
          ),
        }),
      ),
    }),
  );
  const history = new ReadingHistory();
  const stored = JSON.parse(storage.getItem('arcaFeed:readingHistory'));
  assert.equal(stored.sessions.length, 20);
  assert.ok(
    stored.sessions.reduce(
      (total, item) => total + item.articleList.length,
      0,
    ) <= SESSION_TOTAL_ARTICLE_LIMIT,
  );
  for (const item of stored.sessions)
    assert.ok(item.articleList.includes(item.path));
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
  first.saveSession(session('first', { updatedAt: 1 }));
  second.saveSession(session('second', { updatedAt: 2 }));
  first.saveSession(session('first', { scrollY: 700, updatedAt: 3 }));
  second.saveSession(session('second', { scrollY: 800, updatedAt: 4 }));
  first.reload();
  assert.deepEqual(
    first.sessions.map((item) => [item.id, item.scrollY]),
    [
      ['second', 800],
      ['first', 700],
    ],
  );
  first.removeSession('first');
  const progress = JSON.parse(storage.getItem('arcaFeed:readingProgress'));
  assert.deepEqual(
    progress.map((item) => item.id),
    ['second'],
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
      window: { location: { origin: 'https://arca.live' } },
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
    vault.reading.saveSession(session('first'));
    vault.reading.saveSession(session('first', { scrollY: 500, updatedAt: 2 }));
    assert.equal(notifications, 0);
    siteVisit(storage, vault.reading, entry('/b/test/100'));
    assert.equal(notifications, 1);
    assert.equal(timers, 0);
    vault.activeIndex = 1;
    assert.equal(timers, 1);
  } finally {
    vault.destroy();
  }
});
