import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader } from './source-loader.mjs';

function fixture() {
  const listeners = new Map();
  const emitted = [];
  const rect = { left: 300, right: 1100, top: 80, bottom: 1800 };
  const content = { getBoundingClientRect: () => rect };
  class Element {
    constructor(background = true) {
      this.background = background;
    }
    contains(element) {
      return this.background && element === content;
    }
    closest() {
      return null;
    }
  }
  const background = new Element();
  const document = {
    dialog: false,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
    querySelector() {
      return this.dialog;
    },
  };
  const window = {
    innerWidth: 1400,
    selection: '',
    getSelection() {
      return this.selection;
    },
  };
  let destroy;
  const swiper = {
    enabled: true,
    allowSlideNext: true,
    allowSlidePrev: true,
    animating: false,
    destroyed: false,
    el: { querySelector: () => content },
    on: (_, handler) => (destroy = handler),
  };
  const vault = { navigating: false };
  const { installSideClick } = sourceLoader({
    globals: { document, window, Element },
    mocks: {
      '@/core/app-events': { eventBus: { emit: (name) => emitted.push(name) } },
      '@/feature/navigation': { isNavigating: (p) => p.navigating },
    },
  })('src/feature/swiper/side-click.ts');
  installSideClick(vault, swiper);
  function event(overrides = {}) {
    return {
      isPrimary: true,
      button: 0,
      detail: 1,
      clientX: 1200,
      clientY: 200,
      target: background,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...overrides,
    };
  }
  return {
    document,
    window,
    swiper,
    vault,
    emitted,
    listeners,
    rect,
    Element,
    destroy: () => destroy(),
    send: (name, overrides) => listeners.get(name)?.(event(overrides)),
    click(overrides) {
      const e = event(overrides);
      listeners.get('pointerdown')?.(e);
      listeners.get('click')?.(e);
      return e;
    },
  };
}

test('wide empty margins trigger the corresponding swipe and follow resized content', () => {
  const f = fixture();
  assert.equal(f.click({ clientX: 100 }).defaultPrevented, true);
  f.click();
  f.click({ clientX: 600 });
  f.click({ clientY: 40 });
  f.click({ clientY: 1900 });
  f.rect.right = 1300;
  f.click();
  f.click({ clientX: 1350 });
  assert.deepEqual(f.emitted, ['toPrevPage', 'toNextPage', 'toNextPage']);
});

test('narrow layouts, controls, selections, dialogs and unavailable movement are ignored', () => {
  for (const [object, key, value] of [
    ['window', 'innerWidth', 1023],
    ['window', 'selection', 'selected text'],
    ['document', 'dialog', true],
    ['swiper', 'enabled', false],
    ['swiper', 'animating', true],
    ['swiper', 'destroyed', true],
    ['swiper', 'allowSlideNext', false],
    ['vault', 'navigating', true],
  ]) {
    const f = fixture();
    f[object][key] = value;
    f.click();
    assert.deepEqual(f.emitted, [], `${object}.${key}`);
  }
  const f = fixture();
  f.swiper.allowSlidePrev = false;
  f.click({ clientX: 100 });
  f.click({ target: new f.Element(false) });
  for (const key of [
    'altKey',
    'ctrlKey',
    'metaKey',
    'shiftKey',
    'defaultPrevented',
  ])
    f.click({ [key]: true });
  for (const overrides of [{ button: 1 }, { detail: 0 }, { detail: 2 }])
    f.click(overrides);
  assert.deepEqual(f.emitted, []);
});

test('dragging, cancelled pointers and clicks without a press never navigate; destroy cleans up', () => {
  const f = fixture();
  f.send('click');
  f.send('pointerdown');
  f.send('pointermove', { clientX: 1240 });
  f.send('click');
  f.send('pointerdown');
  f.send('pointercancel');
  f.send('click');
  f.send('pointerdown');
  f.send('click', { clientX: 1240 });
  assert.deepEqual(f.emitted, []);
  f.destroy();
  assert.equal(f.listeners.size, 0);
});
