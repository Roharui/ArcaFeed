import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader, vaultFixture } from './source-loader.mjs';

function seriesFixture() {
  const buttons = [];
  const events = [];
  const opened = [];
  const entry = {};
  function $(selector, attributes) {
    const node = {
      length: 1,
      attributes,
      first() {
        return this;
      },
      slice() {
        return this;
      },
      remove() {
        return this;
      },
      find() {
        return this;
      },
      css() {
        return this;
      },
      clone() {
        return this;
      },
      append() {
        return this;
      },
      after() {
        return this;
      },
      on(event, callback) {
        this[event] = callback;
        return this;
      },
      toArray() {
        return [entry];
      },
      attr(name, value) {
        if (value !== undefined) return this;
        return name === 'href' ? '/b/test/100' : '';
      },
    };
    if (selector === '<button>') buttons.push(node);
    return node;
  }
  const load = sourceLoader({
    globals: {
      window: {
        location: {
          href: 'https://arca.live/b/test/100?articleKey=scraps',
          pathname: '/b/test/100',
          origin: 'https://arca.live',
        },
        crypto: { randomUUID: () => 'newseries' },
        open: (...args) => opened.push(args),
      },
    },
    mocks: {
      jquery: { default: $ },
      '@/core/app-events': {
        eventBus: { emit: (event) => events.push(event) },
      },
      './search': { parseSearchQuery() {} },
    },
  });
  return { ...load('src/feature/series.ts'), buttons, events, opened };
}

for (const [mode, isSeriesMode, isScrapMode, seriesChannels, expected] of [
  ['channel', false, false, [], 1],
  ['scrap', true, true, [], 1],
  ['subscriptions', true, false, ['test', 'other'], 1],
  ['single subscription', true, false, ['test'], 1],
  ['series', true, false, [], 0],
]) {
  test(`series open button availability in ${mode} mode`, () => {
    const fixture = seriesFixture();
    fixture.initSeriesContent(
      vaultFixture({ isSeriesMode, isScrapMode, seriesChannels }),
    );
    assert.equal(fixture.buttons.length, expected);
    if (expected) {
      assert.equal(fixture.buttons[0].attributes.type, 'button');
      fixture.buttons[0].click();
      assert.deepEqual(fixture.events, ['enableSeries']);
    }
  });
}

for (const [feed, isScrapMode, seriesChannels] of [
  ['scraps', true, []],
  ['subscriptions', false, ['test', 'other']],
]) {
  test(`opening a series from ${feed} creates a separate session in a new tab`, () => {
    const fixture = seriesFixture();
    const copies = [];
    const p = vaultFixture({
      articleKey: 'scraps',
      isSeriesMode: true,
      isScrapMode,
      seriesChannels,
      copySeriesStorage: (...args) => copies.push(args),
    });
    fixture.initEnableSeries(p);
    assert.deepEqual(copies[0].slice(0, 4), [
      'scraps',
      'newserie',
      ['/b/test/100?articleKey=scraps'],
      0,
    ]);
    assert.deepEqual(fixture.opened, [
      [
        'https://arca.live/b/test/100?articleKey=newserie',
        '_blank',
        'noopener',
      ],
    ]);
    assert.equal(p.isScrapMode, isScrapMode);
    assert.deepEqual(p.seriesChannels, seriesChannels);
  });
}
