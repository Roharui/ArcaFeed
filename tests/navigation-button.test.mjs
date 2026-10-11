import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader, vaultFixture } from './source-loader.mjs';

for (const pointerType of ['mouse', 'touch']) {
  test(`${pointerType} reveals only through the button area`, () => {
    let idleCallback;
    let scroll;
    let control;
    let trigger;
    const jquery = (_, attributes) => {
      const classes = new Set();
      const element = {
        0: {},
        append() {
          return this;
        },
        appendTo() {
          return this;
        },
        handlers: {},
        on(event, callback) {
          this.handlers[event] = callback;
          return this;
        },
        attr() {
          return this;
        },
        text() {
          return this;
        },
        toggleClass() {
          return this;
        },
        removeClass(name) {
          classes.delete(name);
          return this;
        },
        addClass(name) {
          classes.add(name);
          return this;
        },
        is(selector) {
          assert.equal(selector, ':hover');
          return false;
        },
        classes,
      };
      if (attributes?.class === 'arcafeed-navigation-trigger')
        trigger = element;
      if (attributes?.class === 'arcafeed-navigation-control')
        control = element;
      return element;
    };
    class Observer {
      observe() {}
    }
    const { initNavigationList } = sourceLoader({
      globals: {
        document: {
          body: {},
          querySelector: () => null,
          querySelectorAll: () => [],
          addEventListener(event, callback) {
            assert.equal(event, 'scroll');
            scroll = callback;
          },
        },
        window: {
          addEventListener() {},
        },
        ResizeObserver: Observer,
        MutationObserver: Observer,
        requestAnimationFrame: () => 1,
        setTimeout(callback, delay) {
          assert.equal(delay, 1500);
          idleCallback = callback;
          return 1;
        },
        clearTimeout() {},
      },
      mocks: {
        jquery: { default: jquery },
        './readingUi': {},
        '@/feature/swiper/page': {},
        '@/feature/article/loading': {
          isArticleLoading: () => false,
          subscribeArticleLoading(callback) {
            callback(false);
            return () => {};
          },
        },
      },
    })('src/feature/modal/navigationTab.ts');
    initNavigationList(vaultFixture({ subscribe: () => () => {} }));
    const event = { originalEvent: { pointerType } };
    assert.equal(trigger.classes.has('is-hovered'), false);
    control.handlers.pointerenter(event);
    control.handlers.pointerdown(event);
    assert.equal(trigger.classes.has('is-hovered'), true);
    scroll();
    assert.equal(trigger.classes.has('is-hovered'), false);
    control.handlers.pointerenter(event);
    assert.equal(trigger.classes.has('is-hovered'), pointerType === 'mouse');
    control.handlers.pointerdown(event);
    assert.equal(trigger.classes.has('is-hovered'), true);
    control.handlers.pointerleave(event);
    if (pointerType === 'touch') {
      assert.equal(trigger.classes.has('is-hovered'), true);
      idleCallback();
    }
    assert.equal(trigger.classes.has('is-hovered'), false);
  });
}
