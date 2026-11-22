import assert from 'node:assert/strict';
import test from 'node:test';
import { deferred, sourceLoader, vaultFixture } from './source-loader.mjs';

function scheduler() {
  const frames = new Map();
  const timers = new Map();
  let id = 0;
  const globals = {
    requestAnimationFrame: (fn) => {
      frames.set(++id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    setTimeout: (fn, delay) => {
      timers.set(++id, { fn, delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  return {
    globals,
    frames,
    timers,
    paint() {
      for (const [id, fn] of [...frames]) {
        frames.delete(id);
        fn();
      }
    },
    runTimers() {
      for (const [id, { fn }] of [...timers]) {
        timers.delete(id);
        fn();
      }
    },
  };
}

test('deferred tasks yield past the frame, can be cancelled, and run once without frames', () => {
  const clock = scheduler();
  const { afterPaint } = sourceLoader({ globals: clock.globals })(
    'src/utils/after-paint.ts',
  );
  let calls = 0;
  afterPaint(() => calls++);
  assert.equal(calls, 0);
  clock.paint();
  assert.equal(calls, 0);
  assert.deepEqual(
    [...clock.timers.values()].map(({ delay }) => delay),
    [0],
  );
  clock.runTimers();
  assert.equal(calls, 1);
  afterPaint(() => calls++)();
  clock.paint();
  clock.runTimers();
  assert.equal(calls, 1);
  afterPaint(() => calls++);
  assert.deepEqual(
    [...clock.timers.values()].map(({ delay }) => delay),
    [200],
  );
  clock.runTimers();
  clock.paint();
  clock.runTimers();
  assert.equal(calls, 2);
  assert.equal(clock.frames.size, 0);
});

test('initialization prepares Swiper and releases the queue before creating navigation controls', async () => {
  const clock = scheduler();
  const calls = [];
  const feature = Object.fromEntries(
    [
      'addVersionInfo',
      'initLink',
      'initButton',
      'initEvent',
      'initSeriesContent',
      'initUi',
      'initReading',
      'initSwiper',
    ].map((name) => [
      name,
      () => {
        calls.push(name);
      },
    ]),
  );
  const { EventManager } = sourceLoader({
    globals: clock.globals,
    mocks: {
      '@/feature': feature,
      '@/feature/article/prefetch': {
        initArticlePrefetch() {
          calls.push('prefetch');
        },
      },
      '@/feature/modal/navigationTab': {
        initNavigationList() {
          calls.push('navigation');
        },
      },
    },
  })('src/core/event.ts');
  const p = vaultFixture();
  p.flushSave = () => calls.push('flush');
  const events = new EventManager();
  await events.runner.run(p, events.init());
  assert.ok(calls.indexOf('initUi') < calls.indexOf('initSwiper'));
  assert.ok(calls.indexOf('initReading') < calls.indexOf('initSwiper'));
  assert.deepEqual(calls.slice(-3), ['initSwiper', 'prefetch', 'flush']);
  clock.paint();
  assert.equal(calls.includes('navigation'), false);
  clock.runTimers();
  assert.equal(calls.at(-1), 'navigation');
});

test('unsupported pages exit before opening IndexedDB or constructing the application', async () => {
  const calls = [];
  sourceLoader({
    globals: {
      window: { location: { href: 'https://bbs.ruliweb.com/u/settings' } },
    },
    mocks: {
      '@/vault/indexed-storage': {
        initializeStorage: () => calls.push('storage'),
      },
      '@/core': {
        RuliFeed: class {
          constructor() {
            calls.push('app');
          }
        },
        eventBus: { emit: () => calls.push('init') },
      },
      '@/feature/swiper/skip-toast': { captureSkippedToast() {} },
      get '@css/ruliweb.css'() {
        calls.push('layout');
        return {};
      },
    },
  })('src/index.ts');
  await Promise.resolve();
  assert.deepEqual(calls, []);
});

test('layout is applied before storage completes while application initialization waits', async () => {
  const calls = [];
  const storage = deferred();
  sourceLoader({
    globals: {
      window: {
        location: {
          href: 'https://bbs.ruliweb.com/community/board/300143/read/100',
        },
      },
      process: { env: { NODE_ENV: 'production' } },
      document: { head: {}, readyState: 'interactive' },
    },
    mocks: {
      get '@css/ruliweb.css'() {
        calls.push('layout');
        return {};
      },
      '@/vault/indexed-storage': {
        initializeStorage() {
          calls.push('storage');
          return storage.promise;
        },
      },
      '@/core': {
        RuliFeed: class {
          constructor() {
            calls.push('app');
          }
        },
        eventBus: { emit: () => calls.push('init') },
      },
      '@/feature/swiper/skip-toast': { captureSkippedToast() {} },
    },
  })('src/index.ts');
  await new Promise(setImmediate);
  assert.deepEqual(calls, ['storage', 'layout']);
  storage.resolve();
  await new Promise(setImmediate);
  assert.deepEqual(calls, ['storage', 'layout', 'app', 'init']);
});

test('storage starts during parsing and DOM initialization waits for the parsed document', async () => {
  const calls = [];
  let domReady;
  let headChanged;
  const document = { head: null, readyState: 'loading' };
  sourceLoader({
    globals: {
      window: {
        location: {
          href: 'https://bbs.ruliweb.com/community/board/300143/read/100',
        },
        addEventListener(type, handler, options) {
          assert.equal(type, 'DOMContentLoaded');
          assert.equal(options.capture, true);
          assert.equal(options.once, true);
          domReady = handler;
        },
      },
      process: { env: { NODE_ENV: 'production' } },
      document,
      MutationObserver: class {
        constructor(callback) {
          headChanged = callback;
        }

        observe() {}
        disconnect() {}
      },
    },
    mocks: {
      '@css/ruliweb.css': {},
      '@/vault/indexed-storage': {
        initializeStorage: () => calls.push('storage'),
      },
      '@/core': {
        RuliFeed: class {},
        eventBus: { emit: () => calls.push('init') },
      },
      '@/feature/swiper/skip-toast': { captureSkippedToast() {} },
    },
  })('src/index.ts');
  assert.deepEqual(calls, []);
  document.head = {};
  headChanged();
  await new Promise(setImmediate);
  assert.deepEqual(calls, ['storage']);
  domReady();
  await new Promise(setImmediate);
  assert.deepEqual(calls, ['storage', 'init']);
});
