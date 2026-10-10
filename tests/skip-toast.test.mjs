import assert from 'node:assert/strict';
import test from 'node:test';
import { memoryStorage, sourceLoader, vaultFixture } from './source-loader.mjs';

function fixture() {
  const storage = memoryStorage();
  const messages = [];
  const navigations = [];
  let fail = false;
  const load = sourceLoader({
    globals: {
      sessionStorage: storage,
      window: {
        location: {
          href: 'https://arca.live/b/test/100?articleKey=session',
          replace(url) {
            if (fail) throw new Error('navigation failed');
            navigations.push(url);
          },
        },
      },
    },
    mocks: {
      '@/utils/toast': { showToast: (message) => messages.push(message) },
    },
  });
  const { toLink } = load('src/feature/swiper/page.ts');
  const toast = load('src/feature/swiper/skip-toast.ts');
  const p = vaultFixture({
    activeIndex: 0,
    articleList: ['/b/test/100', '/b/test/99', '/b/test/98', '/b/test/97'],
    reading: {
      hasVisited: (path) => ['/b/test/99', '/b/test/98'].includes(path),
    },
  });
  p.skipVisitedArticles = true;
  return {
    storage,
    messages,
    navigations,
    toLink,
    toast,
    p,
    fail() {
      fail = true;
    },
  };
}

test('skipping visited articles shows one toast on the destination, without delaying navigation', () => {
  const f = fixture();
  f.toLink('NEXT')(f.p);
  assert.deepEqual(f.navigations, ['/b/test/97?arcaFeedSkipped=2']);
  assert.deepEqual(f.messages, []);
  f.toast.showPendingSkippedToast('/b/test/97');
  f.toast.showPendingSkippedToast('/b/test/97');
  assert.deepEqual(f.messages, ['최근 본 글 2개를 건너뛰었습니다']);
});

test('previous navigation and disabled skipping do not report visited skips', () => {
  for (const mode of ['NEXT', 'PREV']) {
    const f = fixture();
    if (mode === 'NEXT') f.p.skipVisitedArticles = false;
    else f.p.activeIndex = 3;
    f.toLink(mode)(f.p);
    f.toast.showPendingSkippedToast(f.navigations[0]);
    assert.deepEqual(f.messages, []);
  }
});

test('a failed navigation clears its pending notification', () => {
  const f = fixture();
  f.fail();
  assert.throws(() => f.toLink('NEXT')(f.p), /navigation failed/);
  f.toast.showPendingSkippedToast('/b/test/97');
  assert.deepEqual(f.messages, []);
  assert.equal(f.p.activeIndex, 0);
});

test('an all-visited remainder is reported on the current page', () => {
  const f = fixture();
  f.p.reading.hasVisited = () => true;
  f.toLink('NEXT')(f.p);
  assert.deepEqual(f.navigations, []);
  assert.deepEqual(f.messages, ['최근 본 글 3개를 건너뛰었습니다']);
});

test('pending notifications cannot appear on an unrelated page', () => {
  const f = fixture();
  f.toast.queueSkippedToast('/b/test/97', 2);
  f.toast.showPendingSkippedToast('/b/other/97');
  f.toast.showPendingSkippedToast('/b/test/97');
  assert.deepEqual(f.messages, []);
});

test('subscription feed aliases survive the redirect to the real channel', () => {
  const f = fixture();
  f.toast.queueSkippedToast('/b/my/97', 2);
  f.toast.showPendingSkippedToast('/b/test/97');
  f.toast.showPendingSkippedToast('/b/test/97');
  assert.deepEqual(f.messages, ['최근 본 글 2개를 건너뛰었습니다']);
});

test('subscription aliases do not match a different article', () => {
  const f = fixture();
  f.toast.queueSkippedToast('/b/my/97', 2);
  f.toast.showPendingSkippedToast('/b/test/98');
  assert.deepEqual(f.messages, []);
});

test('URL handoff survives cleared storage and is removed before initialization', () => {
  const messages = [];
  const storage = memoryStorage();
  const location = {
    href: 'https://arca.live/b/test/97?articleKey=session&q=hello&arcaFeedSkipped=2',
  };
  const history = {
    state: { site: true },
    replaceState(state, _title, href) {
      assert.deepEqual(state, { site: true });
      location.href = href;
    },
  };
  const toast = sourceLoader({
    globals: { sessionStorage: storage, window: { location, history } },
    mocks: {
      '@/utils/toast': { showToast: (message) => messages.push(message) },
    },
  })('src/feature/swiper/skip-toast.ts');
  toast.captureSkippedToast();
  assert.equal(
    location.href,
    'https://arca.live/b/test/97?articleKey=session&q=hello',
  );
  toast.showPendingSkippedToast('/b/test/97');
  toast.showPendingSkippedToast('/b/test/97');
  assert.deepEqual(messages, ['최근 본 글 2개를 건너뛰었습니다']);
});
