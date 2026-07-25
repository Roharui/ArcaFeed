import assert from 'node:assert/strict';
import test from 'node:test';

import { mapWithConcurrency } from '../src/utils/async.ts';

test('maps in input order while respecting the concurrency limit', async () => {
  let active = 0;
  let peak = 0;

  const result = await mapWithConcurrency([30, 5, 20, 1], 2, async (delay) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    active -= 1;
    return delay * 2;
  });

  assert.deepEqual(result, [60, 10, 40, 2]);
  assert.equal(peak, 2);
});

test('rejects invalid concurrency values', async () => {
  await assert.rejects(
    () => mapWithConcurrency([1], 0, async (value) => value),
    RangeError,
  );
});
