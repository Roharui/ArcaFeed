import assert from 'node:assert/strict';
import test from 'node:test';
import { domFixture } from './dom-fixture.mjs';
import { sourceLoader, vaultFixture } from './source-loader.mjs';

for (const pointerType of ['mouse', 'touch']) {
  test(`${pointerType} reveals only through the button area`, () => {
    let idleCallback;
    let notifyLoading;
    const dom = domFixture();
    const sendPointer = (element, type) => {
      const event = new dom.Event(type);
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      element.dispatchEvent(event);
    };
    const scroll = () => dom.document.dispatchEvent(new dom.Event('scroll'));
    class Observer {
      observe() {}
    }
    const { initNavigationList } = sourceLoader({
      globals: {
        ...dom,
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
        './readingUi': {},
        '@/feature/swiper/page': {},
        '@feed/core/feature/loading': {
          isArticleLoading: () => false,
          subscribeArticleLoading(callback) {
            notifyLoading = callback;
            callback(false);
            return () => {};
          },
        },
      },
    })('src/feature/modal/navigationTab.ts');
    initNavigationList(vaultFixture({ subscribe: () => () => {} }));
    const trigger = dom.document.querySelector('.arcafeed-navigation-trigger');
    const control = dom.document.querySelector('.arcafeed-navigation-control');
    assert.equal(trigger.classList.contains('is-hovered'), false);
    notifyLoading(true);
    assert.equal(trigger.classList.contains('is-loading'), true);
    scroll();
    assert.equal(trigger.classList.contains('is-loading'), true);
    notifyLoading(false);
    assert.equal(trigger.classList.contains('is-loading'), false);
    sendPointer(control, 'pointerenter');
    sendPointer(control, 'pointerdown');
    assert.equal(trigger.classList.contains('is-hovered'), true);
    scroll();
    assert.equal(trigger.classList.contains('is-hovered'), false);
    sendPointer(control, 'pointerenter');
    assert.equal(
      trigger.classList.contains('is-hovered'),
      pointerType === 'mouse',
    );
    sendPointer(control, 'pointerdown');
    assert.equal(trigger.classList.contains('is-hovered'), true);
    sendPointer(control, 'pointerleave');
    if (pointerType === 'touch') {
      assert.equal(trigger.classList.contains('is-hovered'), true);
      idleCallback();
    }
    assert.equal(trigger.classList.contains('is-hovered'), false);
  });
}
