import assert from 'node:assert/strict';
import test from 'node:test';
import { listingFixture } from './dom-fixture.mjs';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  deferred,
  memoryStorage,
  projectRoot,
  sourceLoader,
  vaultFixture,
} from './source-loader.mjs';

const tick = () => new Promise((resolve) => setImmediate(resolve));
const quietConsole = { ...console, error() {}, warn() {}, log() {} };
const windowFixture = {
  location: {
    href: 'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=session',
    origin: 'https://bbs.ruliweb.com',
  },
  history: { replaceState() {} },
};

test('application commands are queued, awaited, and keep events emitted by an active command', async () => {
  const gate = deferred();
  const calls = [];
  let nested;
  const p = vaultFixture();
  const load = sourceLoader({
    globals: { console: quietConsole },
    mocks: {
      '@/vault': {
        VaultAdapter: class {
          constructor() {
            return p;
          }
        },
      },
      './event': {
        EventManager: class {
          runner = {
            run: async (vault, steps) => {
              assert.equal(vault, p);
              for (const step of steps) await step();
            },
          };
          init() {
            return [
              async () => {
                calls.push('init');
                await gate.promise;
              },
            ];
          }
          checkFilterModal() {
            return [
              () => {
                calls.push('save UI');
              },
            ];
          }
          closeModal() {
            return [
              () => {
                calls.push('close');
              },
            ];
          }
          toNextPage() {
            return [
              () => {
                calls.push('slide');
                nested = eventBus.emit('renderNextPage');
              },
            ];
          }
          renderNextPage() {
            return [
              () => {
                calls.push('navigate');
              },
            ];
          }
        },
      },
    },
  });
  const { RuliFeed, eventBus } = load('src/core/index.ts');
  const app = new RuliFeed();
  assert.equal(new RuliFeed(), app);
  const init = eventBus.emit('init');
  await tick();
  const save = eventBus.emit('checkFilterModal');
  const repeatedSave = eventBus.emit('checkFilterModal');
  const close = eventBus.emit('closeModal');
  const slide = eventBus.emit('toNextPage');
  await tick();
  assert.deepEqual(calls, ['init']);
  gate.resolve();
  await Promise.all([init, save, repeatedSave, close, slide]);
  await nested;
  assert.deepEqual(calls, ['init', 'save UI', 'close', 'slide', 'navigate']);
});

test('a failed queued command rejects its caller and does not poison subsequent commands', async () => {
  const { EventQueue } = sourceLoader()('@feed/core/core/event-queue');
  const queue = new EventQueue();
  const failure = new Error('failed command');
  const first = queue.run(() => {
    throw failure;
  });
  let ran = false;
  const second = queue.run(() => {
    ran = true;
  });
  await assert.rejects(first, (error) => error === failure);
  await second;
  assert.equal(ran, true);
});

test('EventBus isolates synchronous and asynchronous failures and invokes all subscribers', async () => {
  const errors = [];
  const { EventBus } = sourceLoader({
    globals: { console: { error: (...args) => errors.push(args) } },
  })('@feed/core/core/event-bus');
  const bus = new EventBus();
  const calls = [];
  bus.on('event', () => {
    throw new Error('sync failure');
  });
  bus.on('event', async () => {
    throw new Error('async failure');
  });
  bus.on('event', (value) => {
    calls.push(value);
  });
  await bus.emit('event', 42);
  assert.deepEqual(calls, [42]);
  assert.equal(errors.length, 2);
  let special = false;
  bus.on('__proto__', () => {
    special = true;
  });
  await bus.emit('__proto__');
  assert.equal(special, true);
});

for (const asyncFailure of [false, true]) {
  test(`StepRunner drains parallel work and skips dependencies after a ${asyncFailure ? 'async' : 'sync'} failure`, async () => {
    const { StepRunner } = sourceLoader({ globals: { console: quietConsole } })(
      'src/core/step-runner.ts',
    );
    const gate = deferred();
    const failure = new Error('step failed');
    const p = vaultFixture();
    const calls = [];
    const fail = () => {
      if (asyncFailure) return Promise.reject(failure);
      throw failure;
    };
    let finished = false;
    const work = new StepRunner().run(p, [
      [
        fail,
        async () => {
          calls.push('parallel started');
          await gate.promise;
          calls.push('parallel done');
          return () => calls.push('follow-up');
        },
      ],
      () => calls.push('dependent step'),
    ]);
    const rejection = assert.rejects(work, (error) => error === failure);
    work.then(
      () => {
        finished = true;
      },
      () => {
        finished = true;
      },
    );
    await tick();
    assert.equal(finished, false);
    assert.deepEqual(calls, ['parallel started']);
    gate.resolve();
    await rejection;
    assert.deepEqual(calls, ['parallel started', 'parallel done']);
    assert.equal(p.saves, 0);
  });
}

test('a failed dynamic follow-up stops later steps', async () => {
  const { StepRunner } = sourceLoader({ globals: { console: quietConsole } })(
    'src/core/step-runner.ts',
  );
  await assert.rejects(
    new StepRunner().run(vaultFixture(), [
      () => () => {
        throw new Error('follow-up failed');
      },
      () => assert.fail('dependent step must not execute'),
    ]),
    /follow-up failed/,
  );
});

test('concurrent mapping waits for running requests after failure and stops new requests', async () => {
  const { mapConcurrent } = sourceLoader()('@feed/core/utils/func');
  const gate = deferred();
  const started = [];
  let finished = false;
  const work = mapConcurrent(
    [0, 1, 2, 3],
    async (index) => {
      started.push(index);
      if (index === 0) throw new Error('offline');
      await gate.promise;
      return index;
    },
    2,
  );
  const rejection = assert.rejects(work, /offline/);
  work.then(
    () => {
      finished = true;
    },
    () => {
      finished = true;
    },
  );
  await tick();
  assert.equal(finished, false);
  assert.deepEqual(started, [0, 1]);
  gate.resolve();
  await rejection;
  assert.deepEqual(started, [0, 1]);
});

test('Vault commits related state atomically and list reset invalidates requests and the active index', () => {
  const load = sourceLoader({
    globals: { localStorage: memoryStorage(), window: windowFixture },
  });
  const { Store } = load('src/vault/store.ts');
  const { VaultAdapter } = load('src/vault/index.ts');
  const { captureArticleSession } = load('@feed/core/vault/article-session');
  const config = { saveConfig() {}, loadConfig: () => assert.fail() };
  const vault = new VaultAdapter(new Store(), config, vaultFixture().href);
  const snapshots = [];
  vault.subscribe((state) => snapshots.push(state));
  vault.updateState({
    articleKey: 'new',
    articleList: ['/community/board/300143/read/100'],
    activeIndex: 0,
  });
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].articleKey, 'new');
  assert.equal(snapshots[0].articleList.length, 1);
  assert.equal(snapshots[0].activeIndex, 0);
  const isCurrent = captureArticleSession(vault);
  vault.resetArticleList();
  assert.equal(isCurrent(), false);
  assert.equal(vault.activeIndex, -1);
  assert.deepEqual(vault.articleList, []);
  const afterReset = captureArticleSession(vault);
  vault.destroy();
  assert.equal(afterReset(), false);
});

function listingLoader(
  response,
  next = '?p=2',
  navigate = () => assert.fail('stale navigation'),
) {
  return sourceLoader({
    globals: {
      window: {
        ...windowFixture,
        location: { ...windowFixture.location, replace: navigate },
      },
      DOMParser: class {
        parseFromString() {
          return listingFixture({
            rows: [{ href: '/community/board/300143/read/98' }],
            next,
          });
        }
      },
    },
    mocks: {
      '@feed/core/utils/fetch': { fetchUrl: response },
      '@/utils/toast': { showToast: () => assert.fail('stale toast') },
    },
  })('src/feature/article/fetch.ts');
}

for (const change of ['reset', 'search', 'channels', 'session']) {
  test(`listing requests discard responses after a ${change} change without fetching more pages`, async () => {
    const gate = deferred();
    let calls = 0;
    const { fetchFirstBatch } = listingLoader(() => {
      calls++;
      return gate.promise;
    });
    const p = vaultFixture();
    const work = fetchFirstBatch(p, '100');
    if (change === 'reset') p.resetArticleList();
    if (change === 'search') p.searchQuery = '?q=new';
    if (change === 'channels') p.seriesChannels = ['community/board/300149'];
    if (change === 'session') p.articleKey = 'new';
    const expected = [...p.articleList];
    gate.resolve({ responseText: '' });
    await work;
    assert.deepEqual(p.articleList, expected);
    assert.equal(calls, 1);
  });
}

test('all-batch scrap loading cannot replace or navigate a newer session', async () => {
  const gate = deferred();
  const { fetchAllBatches } = listingLoader(() => gate.promise);
  const p = vaultFixture({
    isSeriesMode: true,
    href: { ...vaultFixture().href, mode: 'SCRAP' },
  });
  const work = fetchAllBatches(p, '');
  p.articleKey = 'new';
  p.articleList = ['/community/board/300149/read/200'];
  gate.resolve({ responseText: '' });
  await work;
  assert.deepEqual(p.articleList, ['/community/board/300149/read/200']);
  assert.equal(p.saves, 0);
});

test('concurrent listing commits deduplicate URLs against the latest list', async () => {
  const gate = deferred();
  const { fetchFirstBatch } = listingLoader(() => gate.promise, null);
  const p = vaultFixture();
  const work = fetchFirstBatch(p, '100');
  p.articleList = [...p.articleList, '/community/board/300143/read/98'];
  gate.resolve({ responseText: '' });
  await work;
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
    '/community/board/300143/read/98',
  ]);
});

test('resetting a list starts fresh background work and an older completion cannot change its index', async () => {
  const gates = [deferred(), deferred()];
  let fetches = 0;
  const { activateArticleLink } = sourceLoader({
    mocks: {
      './fetch': { fetchFirstBatch: () => gates[fetches++].promise },
      '@/feature/filter': {},
    },
  })('src/feature/article/link.ts');
  const p = vaultFixture({ articleList: [] });
  await activateArticleLink(p, '100');
  p.resetArticleList();
  await activateArticleLink(p, '100');
  assert.equal(fetches, 2);
  p.articleList = [
    '/community/board/300143/read/101',
    '/community/board/300143/read/100',
  ];
  p.activeIndex = 0;
  gates[0].resolve();
  await tick();
  assert.equal(p.activeIndex, 0);
  assert.equal(p.saves, 0);
  gates[1].resolve();
  await tick();
  assert.equal(p.activeIndex, 1);
  assert.equal(p.saves, 1);
});

test('invalid navigation indices leave the current article and saved index intact', async () => {
  const { toLink, nextLinkForce } = sourceLoader({
    globals: {
      window: {
        location: { replace: () => assert.fail('invalid navigation') },
      },
    },
  })('src/feature/swiper/page.ts');
  const p = vaultFixture({ activeIndex: 0 });
  await toLink('PREV')(p);
  assert.equal(p.activeIndex, 0);
  p.activeIndex = p.articleList.length - 1;
  await nextLinkForce(p);
  assert.equal(p.activeIndex, 1);
  assert.equal(p.saves, 0);
});

test('repeated navigation events cannot skip articles while the browser is leaving', async () => {
  const navigations = [];
  const { toLink, nextLinkForce } = sourceLoader({
    globals: {
      window: { location: { replace: (url) => navigations.push(url) } },
    },
  })('src/feature/swiper/page.ts');
  const p = vaultFixture({
    activeIndex: 0,
    articleList: [
      '/community/board/300143/read/100',
      '/community/board/300143/read/99',
      '/community/board/300143/read/98',
    ],
  });
  await toLink('NEXT')(p);
  await nextLinkForce(p);
  await toLink('PREV')(p);
  assert.deepEqual(navigations, ['/community/board/300143/read/99']);
  assert.equal(p.activeIndex, 1);
  assert.equal(p.saves, 1);
});

test('a failed browser navigation restores the saved index and permits retry', async () => {
  let fail = true;
  const navigations = [];
  const { toLink } = sourceLoader({
    globals: {
      window: {
        location: {
          replace: (url) => {
            if (fail) throw new Error('navigation failed');
            navigations.push(url);
          },
        },
      },
    },
  })('src/feature/swiper/page.ts');
  const p = vaultFixture({ activeIndex: 0 });
  await assert.rejects(
    () => toLink('NEXT')(p),
    (error) => error.cause?.message === 'navigation failed',
  );
  assert.equal(p.activeIndex, 0);
  fail = false;
  await toLink('NEXT')(p);
  assert.deepEqual(navigations, ['/community/board/300143/read/99']);
  assert.equal(p.activeIndex, 1);
});

test('stored config is normalized at the persistence boundary, preserving valid legacy fields', () => {
  const load = sourceLoader({ globals: { window: windowFixture } });
  const { ConfigService } = load('src/vault/config.ts');
  const { StorageRepository } = load('src/vault/repository.ts');
  const storage = memoryStorage({
    'ruliFeed:articleFilterConfig': JSON.stringify({
      'community/board/300143': {
        tab: ['media', 1],
        title: null,
        disableSwiper: 'false',
        onlyBest: true,
      },
      invalid: null,
    }),
    'ruliFeed:uiSettings': JSON.stringify({
      hideBlur: false,
      hideScrollbar: 'false',
      contentWidth: 99999,
      hiddenChannels: 'community/board/300143',
      homeSeriesChannels: [
        'community/board/300143',
        false,
        'community/board/300143',
      ],
      lastModalTab: 'unknown',
    }),
    'ruliFeed:session:articleList': JSON.stringify([
      '/community/board/300143/read/100',
      'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=old',
      '/community/board/300143/read/99/',
      42,
      '/settings',
      'https://example.com/community/board/300143/read/98',
    ]),
    'ruliFeed:session:lastActiveIndex': 'oops',
    'ruliFeed:recentArticleKeys': '{}',
  });
  const state = new ConfigService(new StorageRepository(storage)).loadConfig();
  assert.deepEqual(state.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
  ]);
  assert.equal(state.lastActiveIndex, -1);
  assert.deepEqual(state.articleFilterConfig, {
    'community/board/300143': {
      tab: ['media'],
      title: [],
      disableSwiper: false,
      onlyBest: true,
    },
  });
  assert.equal(state.uiSettings.hideBlur, false);
  assert.equal(state.uiSettings.hideScrollbar, true);
  assert.equal(state.uiSettings.contentWidth, 1400);
  assert.equal(state.uiSettings.lastModalTab, 'filter');
  assert.deepEqual(state.uiSettings.hiddenChannels, []);
  assert.deepEqual(state.uiSettings.homeSeriesChannels, [
    'community/board/300143',
  ]);
});

test('syntactically valid but wrong-shaped JSON cannot corrupt startup defaults', () => {
  const load = sourceLoader({ globals: { window: windowFixture } });
  const { ConfigService } = load('src/vault/config.ts');
  const { StorageRepository } = load('src/vault/repository.ts');
  const storage = memoryStorage({
    'ruliFeed:articleFilterConfig': '[]',
    'ruliFeed:uiSettings': '"invalid"',
    'ruliFeed:session:articleList': '{}',
    'ruliFeed:recentArticleKeys': '[1, null, "session", "session"]',
  });
  const state = new ConfigService(new StorageRepository(storage)).loadConfig();
  assert.deepEqual(state.articleList, []);
  assert.deepEqual(state.articleFilterConfig, {});
  assert.equal(state.uiSettings.contentWidth, 700);
  assert.deepEqual(state.uiSettings.homeSeriesChannels, []);
});

test('runtime source imports form an acyclic graph', () => {
  const graph = new Map();
  const feedCoreRoot = fs.realpathSync(
    path.join(projectRoot, 'node_modules/@feed/core'),
  );
  function visitDirectory(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visitDirectory(filename);
        continue;
      }
      if (!filename.endsWith('.ts') || filename.endsWith('.d.ts')) continue;
      const { outputText } = ts.transpileModule(
        fs.readFileSync(filename, 'utf8'),
        {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2020,
          },
        },
      );
      const parsed = ts.createSourceFile(
        filename,
        outputText,
        ts.ScriptTarget.ES2020,
      );
      const imports = parsed.statements.flatMap((statement) => {
        if (
          !(
            ts.isImportDeclaration(statement) ||
            ts.isExportDeclaration(statement)
          )
        )
          return [];
        const specifier = statement.moduleSpecifier?.text;
        if (!specifier || specifier.endsWith('.css')) return [];
        const base = specifier.startsWith('@/')
          ? path.join(projectRoot, 'src', specifier.slice(2))
          : specifier === '@feed/core' || specifier.startsWith('@feed/core/')
            ? path.join(
                feedCoreRoot,
                'src',
                specifier === '@feed/core'
                  ? ''
                  : specifier.slice('@feed/core/'.length),
              )
            : specifier.startsWith('.')
              ? path.resolve(path.dirname(filename), specifier)
              : null;
        return base
          ? [
              fs.existsSync(`${base}.ts`)
                ? `${base}.ts`
                : path.join(base, 'index.ts'),
            ]
          : [];
      });
      graph.set(filename, imports);
    }
  }
  visitDirectory(path.join(projectRoot, 'src'));
  visitDirectory(path.join(feedCoreRoot, 'src'));
  const visited = new Set();
  function walk(filename, stack = []) {
    assert.equal(
      stack.includes(filename),
      false,
      `Circular runtime imports: ${[...stack, filename].map((file) => path.relative(projectRoot, file)).join(' -> ')}`,
    );
    if (visited.has(filename)) return;
    for (const target of graph.get(filename) ?? [])
      walk(target, [...stack, filename]);
    visited.add(filename);
  }
  for (const filename of graph.keys()) walk(filename);
});

test('list jumps preserve session parameters and share the navigation guard', async () => {
  const navigations = [];
  const { navigateToArticle, toLink } = sourceLoader({
    globals: {
      window: { location: { replace: (url) => navigations.push(url) } },
    },
  })('src/feature/swiper/page.ts');
  const p = vaultFixture({
    activeIndex: 0,
    articleList: [
      '/community/board/300143/read/100',
      '/community/board/300149/read/95',
      '/community/board/300143/read/90',
    ],
    searchQuery: '?articleKey=feed&search=hello',
  });
  for (const index of [-1, 3, 1.5, NaN]) navigateToArticle(p, index);
  assert.equal(p.saves, 0);
  await navigateToArticle(p, 2);
  assert.deepEqual(navigations, [
    '/community/board/300143/read/90?articleKey=feed&search=hello',
  ]);
  assert.equal(p.activeIndex, 2);
  assert.equal(p.saves, 1);
  await toLink('PREV')(p);
  await navigateToArticle(p, 1);
  assert.equal(navigations.length, 1);
});

test('failed list jumps restore position and allow cross-channel retry', async () => {
  let fail = true;
  const navigations = [];
  const { navigateToArticle } = sourceLoader({
    globals: {
      window: {
        location: {
          replace: (url) => {
            if (fail) throw new Error('blocked');
            navigations.push(url);
          },
        },
      },
    },
  })('src/feature/swiper/page.ts');
  const p = vaultFixture({
    activeIndex: 0,
    articleList: [
      '/community/board/300143/read/100',
      '/community/board/300149/read/42',
    ],
  });
  await assert.rejects(
    () => navigateToArticle(p, 1),
    (error) => error.cause?.message === 'blocked',
  );
  assert.equal(p.activeIndex, 0);
  fail = false;
  await navigateToArticle(p, 1);
  assert.equal(p.activeIndex, 1);
  assert.deepEqual(navigations, ['/community/board/300149/read/42']);
});

test('fetchFirstBatch continues past the current article at page end and resumes refills from nextPageUrl', async () => {
  const requests = [];
  const pages = {
    '/community/board/300143/read/98?view_best=1': {
      rows: [
        { href: '/community/board/300143/read/100' },
        { href: '/community/board/300143/read/99' },
        { href: '/community/board/300143/read/98' },
      ],
      next: 'https://m.ruliweb.com/community/board/300143?view_best=1&page=2',
    },
    '/community/board/300143?view_best=1&page=2': {
      rows: [
        { href: '/community/board/300143/read/97' },
        { href: '/community/board/300143/read/96' },
      ],
      next: 'https://m.ruliweb.com/community/board/300143?view_best=1&page=3',
    },
    '/community/board/300143?view_best=1&page=3': {
      rows: [{ href: '/community/board/300143/read/95' }],
      next: 'https://m.ruliweb.com/community/board/300143?view_best=1&page=4',
    },
  };
  const { fetchFirstBatch } = sourceLoader({
    globals: {
      window: windowFixture,
      DOMParser: class {
        parseFromString(text) {
          return listingFixture(pages[text]);
        }
      },
    },
    mocks: {
      '@feed/core/utils/fetch': {
        fetchUrl: async (url) => {
          requests.push(url);
          return { responseText: url };
        },
      },
      '@/utils/toast': { showToast: () => assert.fail('unexpected toast') },
    },
  })('src/feature/article/fetch.ts');

  const p = vaultFixture({
    href: {
      mode: 'ARTICLE',
      channelId: 'community/board/300143',
      articleId: '98',
      articleKey: 'session',
      search: '?view_best=1',
    },
    articleList: [],
    activeIndex: -1,
  });

  // Landing on the last article of page 1 must also fetch page 2 so next swipe is unlocked.
  await fetchFirstBatch(p, '98');
  assert.deepEqual(requests, [
    '/community/board/300143/read/98?view_best=1',
    '/community/board/300143?view_best=1&page=2',
  ]);
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
    '/community/board/300143/read/98',
    '/community/board/300143/read/97',
    '/community/board/300143/read/96',
  ]);
  assert.equal(p.nextPageUrl, '/community/board/300143?view_best=1&page=3');

  // A removed row shifts the unseen article onto the already fetched page.
  pages['/community/board/300143?view_best=1&page=2'].rows.push({
    href: '/community/board/300143/read/95',
  });
  await fetchFirstBatch(p, '96');
  assert.deepEqual(requests, [
    '/community/board/300143/read/98?view_best=1',
    '/community/board/300143?view_best=1&page=2',
    '/community/board/300143?view_best=1&page=2',
  ]);
  assert.deepEqual(p.articleList, [
    '/community/board/300143/read/100',
    '/community/board/300143/read/99',
    '/community/board/300143/read/98',
    '/community/board/300143/read/97',
    '/community/board/300143/read/96',
    '/community/board/300143/read/95',
  ]);
  assert.equal(p.nextPageUrl, '/community/board/300143?view_best=1&page=3');

  // Resetting the list clears the pagination cursor.
  p.resetArticleList();
  assert.equal(p.nextPageUrl, '');
});

test('article and subscription refills ignore unrelated newer listing pages', async () => {
  const base = '/community/board/300143';
  const path = (id) => `${base}/read/${id}`;
  const pages = {
    [path(98)]: {
      rows: [
        ...[101, 100].map((id) => ({ href: path(id) })),
        { href: '/community/board/300149/read/42' },
      ],
      next: '?page=2',
    },
    [`${base}?page=2`]: {
      rows: [99, 98, 97].map((id) => ({ href: path(id) })),
    },
  };
  const { fetchFirstBatch, fetchChannelArticlesBefore } = sourceLoader({
    globals: {
      window: windowFixture,
      DOMParser: class {
        parseFromString(text) {
          return listingFixture(pages[text]);
        }
      },
    },
    mocks: {
      '@feed/core/utils/fetch': {
        fetchUrl: async (url) => ({ responseText: url }),
      },
      '@/utils/toast': { showToast: () => assert.fail('unexpected toast') },
    },
  })('src/feature/article/fetch.ts');
  const p = vaultFixture({
    href: { ...vaultFixture().href, articleId: '98' },
    articleList: [],
  });
  await fetchFirstBatch(p, '98');
  assert.deepEqual(p.articleList, [99, 98, 97].map(path));
  assert.equal(p.activeIndex, 1);
  assert.equal(p.articleList[p.getAdjacentArticleIndex('NEXT')], path(97));
  assert.deepEqual(
    await fetchChannelArticlesBefore('community/board/300143', 98),
    [path(97)],
  );
});

test('NavigationStorage persists and restores nextPageUrl across navigations', () => {
  const load = sourceLoader({ globals: { window: windowFixture } });
  const { NavigationStorage } = load('src/vault/navigation-storage.ts');
  const { StorageRepository } = load('src/vault/repository.ts');
  const { createInitialState } = load('src/vault/store.ts');
  const storage = memoryStorage();
  const nav = new NavigationStorage(new StorageRepository(storage));
  const state = {
    ...createInitialState(),
    articleKey: 'session',
    articleList: ['/community/board/300143/read/100'],
    activeIndex: 0,
    searchQuery: '?view_best=1',
    nextPageUrl: '/community/board/300143?view_best=1&page=3',
  };
  nav.save(state);
  const loaded = nav.load('session');
  assert.equal(
    loaded.nextPageUrl,
    '/community/board/300143?view_best=1&page=3',
  );
});
