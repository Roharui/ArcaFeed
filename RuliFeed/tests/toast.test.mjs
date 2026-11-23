import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLoader } from './source-loader.mjs';

function toastFixture() {
  const instances = [];
  const document = {
    createElement(tagName) {
      const listeners = new Map();
      return {
        tagName,
        children: [],
        append(...children) {
          this.children.push(...children);
        },
        addEventListener(name, listener) {
          listeners.set(name, listener);
        },
        dispatch(name, properties = {}) {
          listeners.get(name)?.({ stopPropagation() {}, ...properties });
        },
      };
    },
  };
  const toast = sourceLoader({
    globals: { document },
    mocks: {
      'toastify-js': {
        default(options) {
          const instance = {
            options,
            shown: 0,
            hidden: 0,
            showToast() {
              this.shown++;
            },
            hideToast() {
              this.hidden++;
            },
          };
          instances.push(instance);
          return instance;
        },
      },
    },
  })('src/utils/toast.ts');
  return { ...toast, instances };
}

for (const [index, accepted] of [
  [0, true],
  [1, false],
]) {
  test(`${accepted ? 'continue' : 'cancel'} button resolves a persistent confirmation toast`, async () => {
    const { showConfirmToast, instances } = toastFixture();
    const result = showConfirmToast('계속 검색할까요?', '계속 검색');
    const toast = instances[0];
    const [message, actions] = toast.options.node.children;
    assert.equal(message.textContent, '계속 검색할까요?');
    assert.deepEqual(
      actions.children.map((button) => [button.type, button.textContent]),
      [
        ['button', '계속 검색'],
        ['button', '취소'],
      ],
    );
    assert.equal(toast.options.duration, -1);
    assert.equal(toast.options.style.background, 'rgba(20, 20, 20, 0.92)');
    let settled = false;
    void result.then(() => (settled = true));
    await Promise.resolve();
    assert.equal(settled, false);
    actions.children[index].dispatch('click');
    assert.equal(await result, accepted);
    assert.equal(toast.hidden, 1);
    // A delayed removal callback and double click cannot change the decision.
    toast.options.callback();
    actions.children[1 - index].dispatch('click');
    assert.equal(await result, accepted);
    assert.equal(toast.hidden, 1);
  });
}

test('Escape cancels the confirmation without invoking page shortcuts', async () => {
  const { showConfirmToast, instances } = toastFixture();
  const result = showConfirmToast('계속 검색할까요?');
  let stopped = false;
  instances[0].options.node.dispatch('keydown', {
    key: 'Escape',
    stopPropagation: () => (stopped = true),
  });
  assert.equal(await result, false);
  assert.equal(stopped, true);
});

test('aborting a confirmation closes it, and an aborted signal creates no toast', async () => {
  const { showConfirmToast, instances } = toastFixture();
  const controller = new AbortController();
  const result = showConfirmToast(
    '계속 검색할까요?',
    '계속 검색',
    controller.signal,
  );
  controller.abort();
  assert.equal(await result, false);
  assert.equal(instances[0].hidden, 1);
  assert.equal(
    await showConfirmToast('계속 검색할까요?', '계속 검색', controller.signal),
    false,
  );
  assert.equal(instances.length, 1);
});

test('replacing a confirmation cancels it without a delayed callback closing the new toast', async () => {
  const { showConfirmToast, showToast, instances } = toastFixture();
  const first = showConfirmToast('첫 번째 질문');
  const second = showConfirmToast('두 번째 질문');
  assert.equal(await first, false);
  assert.equal(instances[0].hidden, 1);
  instances[0].options.callback();
  assert.equal(instances[1].hidden, 0);
  showToast('알림');
  assert.equal(await second, false);
  assert.equal(instances[1].hidden, 1);
  instances[1].options.callback();
  assert.equal(instances[2].hidden, 0);
});
