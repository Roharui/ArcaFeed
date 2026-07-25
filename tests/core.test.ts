import assert from 'node:assert/strict';
import test from 'node:test';

import { EventBus } from '../src/core/event-bus.ts';
import { StepRunner } from '../src/core/step-runner.ts';

import type { VaultAdapter } from '../src/vault/index.ts';

test('event bus subscribes, awaits handlers, and unsubscribes', async () => {
  const bus = new EventBus<'save'>();
  const calls: string[] = [];
  const unsubscribe = bus.on('save', async () => {
    await Promise.resolve();
    calls.push('saved');
  });

  await bus.emit('save');
  unsubscribe();
  await bus.emit('save');

  assert.deepEqual(calls, ['saved']);
});

test('step runner preserves sequential stages and flushes once', async () => {
  const calls: string[] = [];
  const vault = {
    flushSave: () => calls.push('flush'),
  } as unknown as VaultAdapter;
  const runner = new StepRunner();

  await runner.run(vault, [
    [
      async () => {
        await Promise.resolve();
        calls.push('parallel-a');
      },
      () => {
        calls.push('parallel-b');
      },
    ],
    () => {
      calls.push('last');
    },
  ]);

  assert.deepEqual(calls.slice(-2), ['last', 'flush']);
  assert.equal(calls.filter((call) => call === 'flush').length, 1);
});

test('step runner still flushes after a failed step', async () => {
  const calls: string[] = [];
  const originalConsoleError = console.error;
  console.error = () => undefined;
  const vault = {
    flushSave: () => {
      calls.push('flush');
    },
  } as unknown as VaultAdapter;

  try {
    await assert.rejects(
      () =>
        new StepRunner().run(vault, [
          [
            () => {
              throw new Error('boom');
            },
            async () => {
              await new Promise((resolve) => setTimeout(resolve, 5));
              calls.push('slow-finished');
            },
          ],
        ]),
      /boom/,
    );
    assert.deepEqual(calls, ['slow-finished', 'flush']);
  } finally {
    console.error = originalConsoleError;
  }
});
