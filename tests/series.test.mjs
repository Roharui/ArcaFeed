import assert from 'node:assert/strict';
import test from 'node:test';
import { domFixture } from './dom-fixture.mjs';
import { sourceLoader, vaultFixture } from './source-loader.mjs';

function seriesFixture() {
  const events = [];
  const opened = [];
  const dom = domFixture(`<div class="article-series">
    <div class="series-link"><a href="/community/board/300143/read/100">Post</a></div>
  </div><div class="view_content"></div>`);
  const load = sourceLoader({
    globals: {
      ...dom,
      window: {
        location: {
          href: 'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=scraps',
          pathname: '/community/board/300143/read/100',
          origin: 'https://bbs.ruliweb.com',
        },
        crypto: { randomUUID: () => 'newseries' },
        open: (...args) => {
          opened.push(args);
          return {
            opener: {},
            location: { replace: (url) => opened.push([url]) },
            close() {},
          };
        },
      },
    },
    mocks: {
      '@/core/app-events': {
        eventBus: { emit: (event) => events.push(event) },
      },
    },
  });
  return {
    ...load('src/feature/series.ts'),
    document: dom.document,
    events,
    opened,
  };
}

for (const [mode, isSeriesMode, isScrapMode, seriesChannels, expected] of [
  ['channel', false, false, [], 1],
  ['scrap', true, true, [], 1],
  [
    'subscriptions',
    true,
    false,
    ['community/board/300143', 'community/board/300149'],
    1,
  ],
  ['single subscription', true, false, ['community/board/300143'], 1],
  ['series', true, false, [], 0],
]) {
  test(`series open button availability in ${mode} mode`, () => {
    const fixture = seriesFixture();
    fixture.initSeriesContent(
      vaultFixture({ isSeriesMode, isScrapMode, seriesChannels }),
    );
    const buttons = fixture.document.querySelectorAll('.enable-series');
    assert.equal(buttons.length, expected);
    if (expected) {
      assert.equal(buttons[0].type, 'button');
      buttons[0].click();
      assert.deepEqual(fixture.events, ['enableSeries']);
    }
  });
}

for (const [feed, isScrapMode, seriesChannels] of [
  ['scraps', true, []],
  [
    'subscriptions',
    false,
    ['community/board/300143', 'community/board/300149'],
  ],
]) {
  test(`opening a series from ${feed} creates a separate session in a new tab`, async () => {
    const fixture = seriesFixture();
    const copies = [];
    const p = vaultFixture({
      articleKey: 'scraps',
      isSeriesMode: true,
      isScrapMode,
      seriesChannels,
      copySeriesStorage: (...args) => copies.push(args),
    });
    await fixture.initEnableSeries(p);
    assert.deepEqual(copies[0].slice(0, 4), [
      'scraps',
      'newserie',
      ['/community/board/300143/read/100'],
      0,
    ]);
    assert.deepEqual(fixture.opened, [
      ['about:blank', '_blank'],
      [
        'https://bbs.ruliweb.com/community/board/300143/read/100?articleKey=newserie',
      ],
    ]);
    assert.equal(p.isScrapMode, isScrapMode);
    assert.deepEqual(p.seriesChannels, seriesChannels);
  });
}
