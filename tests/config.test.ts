import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inferLegacyHomeSeriesState,
  readLegacyHomeSeriesChannels,
} from '../src/vault/schema.ts';

test('migrates multi-channel legacy home-series state', () => {
  const channels = readLegacyHomeSeriesChannels({
    homeSeriesChannels: [' a ', 'b', 'a', 3],
  });

  assert.deepEqual(channels, ['a', 'b']);
  assert.deepEqual(
    inferLegacyHomeSeriesState(['/b/a/100', '/b/b/90', '/b/a/80'], channels),
    {
      channels: ['a', 'b'],
      cursors: { a: 80, b: 90 },
      exhaustedChannels: [],
    },
  );
});

test('does not misclassify a single-channel legacy article series', () => {
  assert.equal(
    inferLegacyHomeSeriesState(['/b/a/100', '/b/a/90'], ['a', 'b']),
    null,
  );
});
