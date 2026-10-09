import assert from 'node:assert/strict';
import test from 'node:test';
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
    href: 'https://arca.live/b/test/100?articleKey=session',
    origin: 'https://arca.live',
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
          checkUIModal() {
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
  const { ArcaFeed, eventBus } = load('src/core/index.ts');
  const app = new ArcaFeed();
  assert.equal(new ArcaFeed(), app);
  const init = eventBus.emit('init');
  await tick();
  const save = eventBus.emit('checkUIModal');
  const repeatedSave = eventBus.emit('checkUIModal');
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
  const { EventQueue } = sourceLoader()('src/core/event-queue.ts');
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
  })('src/core/event-bus.ts');
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
  const { mapConcurrent } = sourceLoader()('src/utils/func.ts');
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
  const { captureArticleSession } = load('src/vault/article-session.ts');
  const config = { saveConfig() {}, loadConfig: () => assert.fail() };
  const vault = new VaultAdapter(new Store(), config, vaultFixture().href);
  const snapshots = [];
  vault.subscribe((state) => snapshots.push(state));
  vault.updateState({
    articleKey: 'new',
    articleList: ['/b/test/100'],
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
  const chain = {
    length: 1,
    addClass() {
      return this;
    },
    removeClass() {
      return this;
    },
    not() {
      return this;
    },
    each(fn) {
      fn(0, { href: '/b/test/98' });
    },
    next() {
      return this;
    },
    find() {
      return this;
    },
    attr() {
      return next;
    },
  };
  return sourceLoader({
    globals: {
      window: {
        ...windowFixture,
        location: { ...windowFixture.location, replace: navigate },
      },
      DOMParser: class {
        parseFromString() {
          return { documentElement: {} };
        }
      },
    },
    mocks: {
      jquery: {
        default: (value) => (value?.href ? { attr: () => value.href } : chain),
      },
      '@/utils/fetch': { fetchUrl: response },
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
    if (change === 'channels') p.seriesChannels = ['other'];
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
  p.articleList = ['/b/other/200'];
  gate.resolve({ responseText: '' });
  await work;
  assert.deepEqual(p.articleList, ['/b/other/200']);
  assert.equal(p.saves, 0);
});

test('concurrent listing commits deduplicate URLs against the latest list', async () => {
  const gate = deferred();
  const { fetchFirstBatch } = listingLoader(() => gate.promise, null);
  const p = vaultFixture();
  const work = fetchFirstBatch(p, '100');
  p.articleList = [...p.articleList, '/b/test/98'];
  gate.resolve({ responseText: '' });
  await work;
  assert.deepEqual(p.articleList, ['/b/test/100', '/b/test/99', '/b/test/98']);
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
  p.articleList = ['/b/test/101', '/b/test/100'];
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

for (const scenario of ['success', 'empty', 'stale']) {
  test(`home-series startup commits a complete session only on valid nonempty results: ${scenario}`, async () => {
    const gate = deferred();
    const navigations = [];
    const commits = [];
    const channel = {};
    const jquery = (value) =>
      value === channel
        ? {
            attr: () => '/b/test',
            find: () => ({ text: () => 'Test channel' }),
          }
        : { toArray: () => [channel] };
    const { initStartHomeSeries } = sourceLoader({
      globals: {
        window: {
          ...windowFixture,
          location: {
            ...windowFixture.location,
            replace: (url) => navigations.push(url),
          },
        },
      },
      mocks: {
        jquery: { default: jquery },
        '@/feature/article/fetch': {
          showFetchLoader() {},
          hideFetchLoader() {},
          fetchChannelFirstPage: () => gate.promise,
        },
        '@/utils/toast': { showToast() {} },
      },
    })('src/feature/modal/subscribeTab.ts');
    const p = vaultFixture({
      href: { ...vaultFixture().href, mode: 'HOME' },
      uiSettings: { hiddenChannels: [], homeSeriesChannels: [] },
      updateState(patch) {
        Object.assign(this, patch);
        commits.push({ ...this });
      },
    });
    const work = initStartHomeSeries(p);
    if (scenario === 'stale') p.articleKey = 'newer-session';
    gate.resolve(
      scenario === 'empty' ? [] : ['/b/test/99', '/b/test/100', '/b/test/99'],
    );
    await work;
    if (scenario === 'success') {
      assert.equal(commits.length, 1);
      assert.deepEqual(commits[0].articleList, ['/b/test/100', '/b/test/99']);
      assert.equal(commits[0].activeIndex, 0);
      assert.equal(commits[0].isSeriesMode, true);
      assert.equal(commits[0].href.articleKey, commits[0].articleKey);
      assert.equal(
        commits[0].searchQuery,
        `?articleKey=${commits[0].articleKey}`,
      );
      assert.deepEqual(navigations, [
        `https://arca.live/b/test/100?articleKey=${p.articleKey}`,
      ]);
      assert.equal(p.saves, 1);
    } else {
      assert.deepEqual(commits, []);
      assert.deepEqual(navigations, []);
      assert.equal(p.isSeriesMode, false);
      assert.equal(p.saves, 0);
    }
  });
}

test('invalid navigation indices leave the current article and saved index intact', () => {
  const { toLink, nextLinkForce } = sourceLoader({
    globals: {
      window: {
        location: { replace: () => assert.fail('invalid navigation') },
      },
    },
  })('src/feature/swiper/page.ts');
  const p = vaultFixture({ activeIndex: 0 });
  toLink('PREV')(p);
  assert.equal(p.activeIndex, 0);
  p.activeIndex = p.articleList.length - 1;
  nextLinkForce(p);
  assert.equal(p.activeIndex, 1);
  assert.equal(p.saves, 0);
});

test('repeated navigation events cannot skip articles while the browser is leaving', () => {
  const navigations = [];
  const { toLink, nextLinkForce } = sourceLoader({
    globals: {
      window: { location: { replace: (url) => navigations.push(url) } },
    },
  })('src/feature/swiper/page.ts');
  const p = vaultFixture({
    activeIndex: 0,
    articleList: ['/b/test/100', '/b/test/99', '/b/test/98'],
  });
  toLink('NEXT')(p);
  nextLinkForce(p);
  toLink('PREV')(p);
  assert.deepEqual(navigations, ['/b/test/99']);
  assert.equal(p.activeIndex, 1);
  assert.equal(p.saves, 1);
});

test('a failed browser navigation restores the saved index and permits retry', () => {
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
  assert.throws(() => toLink('NEXT')(p), /navigation failed/);
  assert.equal(p.activeIndex, 0);
  fail = false;
  toLink('NEXT')(p);
  assert.deepEqual(navigations, ['/b/test/99']);
  assert.equal(p.activeIndex, 1);
});

test('stored config is normalized at the persistence boundary, preserving valid legacy fields', () => {
  const load = sourceLoader({ globals: { window: windowFixture } });
  const { ConfigService } = load('src/vault/config.ts');
  const { StorageRepository } = load('src/vault/repository.ts');
  const storage = memoryStorage({
    'arcaFeed:articleFilterConfig': JSON.stringify({
      test: {
        tab: ['media', 1],
        title: null,
        disableSwiper: 'false',
        onlyBest: true,
      },
      invalid: null,
    }),
    'arcaFeed:uiSettings': JSON.stringify({
      hideBlur: false,
      hideScrollbar: 'false',
      contentWidth: 99999,
      hiddenChannels: 'test',
      homeSeriesChannels: ['test', false, 'test'],
      lastModalTab: 'unknown',
    }),
    'arcaFeed:session:articleList': JSON.stringify([
      '/b/test/100',
      'https://arca.live/b/test/100?articleKey=old',
      '/b/test/99/',
      42,
      '/settings',
      'https://example.com/b/test/98',
    ]),
    'arcaFeed:session:lastActiveIndex': 'oops',
    'arcaFeed:recentArticleKeys': '{}',
  });
  const state = new ConfigService(new StorageRepository(storage)).loadConfig();
  assert.deepEqual(state.articleList, ['/b/test/100', '/b/test/99']);
  assert.equal(state.lastActiveIndex, -1);
  assert.deepEqual(state.articleFilterConfig, {
    test: { tab: ['media'], title: [], disableSwiper: false, onlyBest: true },
  });
  assert.equal(state.uiSettings.hideBlur, false);
  assert.equal(state.uiSettings.hideScrollbar, true);
  assert.equal(state.uiSettings.contentWidth, 1400);
  assert.equal(state.uiSettings.lastModalTab, 'filter');
  assert.deepEqual(state.uiSettings.hiddenChannels, []);
  assert.deepEqual(state.uiSettings.homeSeriesChannels, ['test']);
});

test('syntactically valid but wrong-shaped JSON cannot corrupt startup defaults', () => {
  const load = sourceLoader({ globals: { window: windowFixture } });
  const { ConfigService } = load('src/vault/config.ts');
  const { StorageRepository } = load('src/vault/repository.ts');
  const storage = memoryStorage({
    'arcaFeed:articleFilterConfig': '[]',
    'arcaFeed:uiSettings': '"invalid"',
    'arcaFeed:session:articleList': '{}',
    'arcaFeed:recentArticleKeys': '[1, null, "session", "session"]',
  });
  const state = new ConfigService(new StorageRepository(storage)).loadConfig();
  assert.deepEqual(state.articleList, []);
  assert.deepEqual(state.articleFilterConfig, {});
  assert.equal(state.uiSettings.contentWidth, 700);
  assert.deepEqual(state.uiSettings.homeSeriesChannels, []);
});

test('runtime source imports form an acyclic graph', () => {
  const graph = new Map();
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
