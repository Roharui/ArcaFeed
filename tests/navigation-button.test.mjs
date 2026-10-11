import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader, vaultFixture } from './source-loader.mjs';

for (const [name, supportsHover, hovered, hides] of [
  ['touch screens ignore lingering hover', false, true, true],
  ['mouse hover keeps the button visible', true, true, false],
  ['mouse screens hide the button without hover', true, false, true],
]) {
  test(name, () => {
    let idleCallback;
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
        on() {
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
          return hovered;
        },
        classes,
      };
      if (attributes?.class === 'arcafeed-navigation-trigger')
        trigger = element;
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
          addEventListener() {},
        },
        window: {
          matchMedia: () => ({ matches: supportsHover }),
          addEventListener() {},
        },
        ResizeObserver: Observer,
        MutationObserver: Observer,
        requestAnimationFrame: () => 1,
        setTimeout(callback, delay) {
          assert.equal(delay, 3000);
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
    idleCallback();
    assert.equal(trigger.classes.has('is-idle'), hides);
  });
}
