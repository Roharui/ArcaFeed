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
    const trigger = dom.document.querySelector('.rulifeed-navigation-trigger');
    const control = dom.document.querySelector('.rulifeed-navigation-control');
    const swipeToggle = control.querySelector('.rulifeed-swipe-toggle');
    const settingsButton = control.querySelector('.rulifeed-settings-trigger');
    assert.deepEqual(Array.from(control.children), [
      swipeToggle,
      settingsButton,
      trigger,
    ]);
    assert.equal(control.classList.contains('is-hovered'), false);
    assert.equal(trigger.classList.contains('is-hovered'), false);
    notifyLoading(true);
    assert.equal(trigger.classList.contains('is-loading'), true);
    scroll();
    assert.equal(trigger.classList.contains('is-loading'), true);
    notifyLoading(false);
    assert.equal(trigger.classList.contains('is-loading'), false);
    sendPointer(control, 'pointerenter');
    sendPointer(control, 'pointerdown');
    assert.equal(control.classList.contains('is-hovered'), true);
    assert.equal(trigger.classList.contains('is-hovered'), true);
    scroll();
    assert.equal(control.classList.contains('is-hovered'), false);
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
    assert.equal(control.classList.contains('is-hovered'), false);
    assert.equal(trigger.classList.contains('is-hovered'), false);
  });
}

test('touch reveal suppresses a blind first click on hidden floating buttons', () => {
  const dom = domFixture();
  const emitted = [];
  class Observer {
    observe() {}
  }
  const { initNavigationList } = sourceLoader({
    globals: {
      ...dom,
      window: { addEventListener() {} },
      ResizeObserver: Observer,
      MutationObserver: Observer,
      requestAnimationFrame: () => 1,
      setTimeout: () => 1,
      clearTimeout() {},
    },
    mocks: {
      './readingUi': {},
      '@/feature/swiper/page': {},
      '@/core/app-events': {
        eventBus: { emit: (event) => emitted.push(event) },
      },
      '@feed/core/feature/loading': {
        isArticleLoading: () => false,
        subscribeArticleLoading: () => () => {},
      },
    },
  })('src/feature/modal/navigationTab.ts');
  initNavigationList(vaultFixture({ subscribe: () => () => {} }));
  const control = dom.document.querySelector('.rulifeed-navigation-control');
  const swipeToggle = control.querySelector('.rulifeed-swipe-toggle');
  const settingsButton = control.querySelector('.rulifeed-settings-trigger');

  const touchDown = new dom.Event('pointerdown');
  Object.defineProperty(touchDown, 'pointerType', { value: 'touch' });
  control.dispatchEvent(touchDown);
  swipeToggle.click();
  assert.deepEqual(emitted, []);

  settingsButton.click();
  assert.deepEqual(emitted, ['showModal']);
});
