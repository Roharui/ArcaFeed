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
  seriesChannels: ['test', 'other'],
  scrollY: 340,
  updatedAt: 1,
  ...patch,
});

test('opening an article immediately records a visit and revisits update a single entry', () => {
  const { ReadingHistory } = readingFixture();
  const history = new ReadingHistory();
  history.visit(entry('/b/test/100'));
  assert.equal(history.hasVisited('/b/test/100'), true);
  assert.ok(history.entries[0].visitedAt > 0);
  history.visit(entry('/b/test/99'));
  history.visit(entry('/b/test/100', '수정된 제목'));
  assert.deepEqual(
    history.entries.map((item) => item.path),
    ['/b/test/100', '/b/test/99'],
  );
  assert.equal(history.entries[0].title, '수정된 제목');
  assert.equal(new ReadingHistory().hasVisited('/b/test/99'), true);
  const paths = history.getVisitedPaths();
  paths.clear();
  assert.equal(history.hasVisited('/b/test/100'), true);
});

test('older tabs merge newer visits and resume checkpoints without losing either', () => {
  const { ReadingHistory } = readingFixture();
  const first = new ReadingHistory();
  const second = new ReadingHistory();
  first.visit(entry('/b/test/100'));
  second.visit(entry('/b/test/99'));
  first.saveSession(session('series:first'));
  second.saveSession(session('series:second'));
  first.visit(entry('/b/test/98'));
  second.reload();
  assert.deepEqual(
    second.entries.map((item) => item.path),
    ['/b/test/98', '/b/test/99', '/b/test/100'],
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

test('clearing history removes visits and checkpoints from persisted and other-tab views', () => {
  const { ReadingHistory } = readingFixture();
  const first = new ReadingHistory();
  const second = new ReadingHistory();
  first.visit(entry('/b/test/100'));
  first.saveSession(session('first'));
  second.reload();
  first.clear();
  second.reload();
  assert.equal(second.hasVisited('/b/test/100'), false);
  assert.deepEqual(second.entries, []);
  assert.deepEqual(second.sessions, []);
  assert.deepEqual(new ReadingHistory().entries, []);
});

test('legacy visits count as seen and invalid stored URLs and checkpoints are rejected', () => {
  const { ReadingHistory, storage, READING_HISTORY_KEY } = readingFixture();
  storage.setItem(
    READING_HISTORY_KEY,
    JSON.stringify({
      entries: [
        { ...entry('/b/test/100'), visitedAt: 1, readAt: null },
        { ...entry('/b/test/100'), visitedAt: 2 },
        { ...entry('https://example.com/b/test/99'), visitedAt: 3 },
        { ...entry('/b/test/98'), visitedAt: -1 },
        null,
      ],
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
  assert.equal(history.hasVisited('/b/test/100'), true);
  assert.equal(history.entries.length, 1);
  assert.equal(history.sessions.length, 1);
  assert.deepEqual(history.sessions[0].articleList, ['/b/test/100']);
  assert.deepEqual(history.sessions[0].seriesChannels, ['test']);
  assert.equal(history.sessions[0].scrollY, 0);
  assert.equal(
    new URLSearchParams(history.sessions[0].searchQuery).has('articleKey'),
    false,
  );
});

test('history and checkpoints keep bounded recent records and evict oldest visits', () => {
  const { ReadingHistory, storage, load, READING_HISTORY_KEY } =
    readingFixture();
  const { HISTORY_LIMIT, SESSION_LIMIT } = load('src/vault/reading-history.ts');
  storage.setItem(
    READING_HISTORY_KEY,
    JSON.stringify({
      entries: Array.from({ length: HISTORY_LIMIT }, (_, index) => ({
        ...entry(`/b/test/${index + 1}`),
        visitedAt: 1,
      })),
      sessions: Array.from({ length: SESSION_LIMIT }, (_, index) =>
        session(`saved:${index}`),
      ),
    }),
  );
  const history = new ReadingHistory();
  history.visit(entry('/b/test/9999'));
  history.saveSession(
    session('new', {
      articleList: Array.from(
        { length: 2100 },
        (_, index) => `/b/test/${index + 1}`,
      ),
    }),
  );
  const reloaded = new ReadingHistory();
  assert.equal(reloaded.entries.length, HISTORY_LIMIT);
  assert.equal(reloaded.entries[0].path, '/b/test/9999');
  assert.equal(reloaded.hasVisited(`/b/test/${HISTORY_LIMIT}`), false);
  assert.equal(reloaded.sessions.length, SESSION_LIMIT);
  assert.equal(reloaded.sessions[0].id, 'new');
  assert.equal(reloaded.sessions[0].articleList.length, 2000);
});

test('next navigation skips seen articles while previous navigation remains available', () => {
  const { load } = readingFixture();
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
    vault.reading.visit(entry('/b/test/99'));
    vault.reading.visit(entry('/b/test/98'));
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 1);
    vault.uiSettings = { ...vault.uiSettings, skipVisitedArticles: true };
    assert.equal(vault.getAdjacentArticleIndex('NEXT'), 3);
    assert.equal(vault.isNextPageActive(), true);
    vault.activeIndex = 2;
    assert.equal(vault.getAdjacentArticleIndex('PREV'), 1);
    vault.reading.visit(entry('/b/test/97'));
    assert.equal(vault.isNextPageActive(), false);
    vault.reading.clear();
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
    vault.reading.visit(entry('/b/test/100'));
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

test('history search waits for Korean composition and clear resets the query and focus', () => {
  const elements = [];
  const jquery = (tag) => {
    const element = {
      tag,
      value: '',
      handlers: new Map(),
      children: [],
      on(event, handler) {
        this.handlers.set(event, handler);
        return this;
      },
      addClass() {
        return this;
      },
      attr() {
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
