import assert from 'node:assert/strict';
import test from 'node:test';

import { FetchUrlError, fetchUrl } from '../src/utils/fetch.ts';

const originalFetch = globalThis.fetch;

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: globalThis,
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('rejects non-success HTTP responses', async () => {
  globalThis.fetch = async () => new Response('failure', { status: 503 });

  await assert.rejects(
    () => fetchUrl('/unavailable'),
    (error: unknown) =>
      error instanceof FetchUrlError &&
      error.status === 503 &&
      error.url === '/unavailable',
  );
});

test('aborts requests that exceed the timeout', async () => {
  globalThis.fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });

  await assert.rejects(
    () => fetchUrl('/slow', { timeoutMs: 5 }),
    (error: unknown) =>
      error instanceof FetchUrlError && error.message.includes('timed out'),
  );
});
