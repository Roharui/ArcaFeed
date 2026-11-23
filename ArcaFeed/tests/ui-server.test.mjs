import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { startUiServer } from '../scripts/ui-server.mjs';
import {
  createFixtureData,
  normalizeScenario,
} from '../scripts/ui/fixtures.mjs';

test('UI scenarios are deterministic, isolated, and stay within the reading session limit', () => {
  assert.equal(normalizeScenario({ mode: 'invalid' }).mode, 'channel');
  const empty = createFixtureData({ size: 'empty' }, 100000);
  assert.equal(empty.entries.length, 0);
  assert.equal(empty.sessions.length, 0);
  const short = createFixtureData({ size: 'short' }, 100000);
  assert.equal(short.channels.length, 1);
  const long = createFixtureData({ size: 'long' }, 100000);
  assert.equal(long.entries.length, 70);
  assert.equal(long.sessions.length, 20);
  assert.equal(long.entries[1].visitedAt, 40000);
  long.sessions.pop();
  assert.equal(createFixtureData({ size: 'long' }, 100000).sessions.length, 20);
});

test('UI server reports current builds, rebuilds on changes, and withholds broken bundles', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'arcafeed-ui-'));
  const cleanup = { preview: null };
  t.after(async () => {
    await cleanup.preview?.close();
    await fs.rm(directory, { recursive: true, force: true });
  });
  const entry = path.join(directory, 'entry.js');
  await fs.writeFile(entry, 'globalThis.uiBuild = 1;');
  const preview = await startUiServer({
    port: 0,
    resultsDirectory: path.join(directory, 'results'),
    onBuild() {},
    config: {
      mode: 'development',
      entry,
      output: { path: directory, filename: 'bundle.js' },
    },
  });
  cleanup.preview = preview;
  const getStatus = async () =>
    (await fetch(`${preview.baseURL}/status`)).json();
  async function waitFor(check) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const status = await getStatus();
      if (check(status)) return status;
      await delay(25);
    }
    assert.fail(
      `Timed out waiting for UI build: ${JSON.stringify(await getStatus())}`,
    );
  }
  const first = await waitFor((status) => status.hash);
  const bundle = await fetch(`${preview.baseURL}/bundle.js`);
  assert.equal(bundle.headers.get('cache-control'), 'no-store');
  assert.equal(bundle.headers.get('x-arcafeed-build'), first.hash);
  assert.match(await bundle.text(), /uiBuild = 1/);
  const fixture = await fetch(`${preview.baseURL}/fixture?mode=home`);
  assert.ok((await fixture.text()).includes(first.hash));
  assert.match(await (await fetch(preview.baseURL)).text(), /iframe/);
  assert.equal((await fetch(`${preview.baseURL}/unknown`)).status, 404);
  assert.equal((await fetch(`${preview.baseURL}/results`)).status, 404);
  const report = { hash: first.hash, passed: true, failures: [] };
  const saved = await fetch(`${preview.baseURL}/results`, {
    method: 'POST',
    body: JSON.stringify(report),
  });
  assert.equal(saved.status, 200);
  assert.deepEqual(
    await (await fetch(`${preview.baseURL}/results`)).json(),
    report,
  );
  assert.deepEqual(
    JSON.parse(await fs.readFile((await saved.json()).reportPath, 'utf8')),
    report,
  );
  assert.equal(
    (
      await fetch(`${preview.baseURL}/results`, {
        method: 'POST',
        body: 'invalid',
      })
    ).status,
    400,
  );
  assert.equal(
    (await fetch(`${preview.baseURL}/status`, { method: 'POST' })).status,
    405,
  );
  await fs.writeFile(entry, 'globalThis.uiBuild = 2;');
  const second = await waitFor(
    (status) => status.hash && status.hash !== first.hash,
  );
  assert.match(
    await (await fetch(`${preview.baseURL}/bundle.js`)).text(),
    /uiBuild = 2/,
  );
  await fs.writeFile(entry, 'globalThis.uiBuild = ;');
  const broken = await waitFor((status) => status.error);
  assert.equal(broken.hash, null);
  assert.match(broken.error, /Module parse failed/);
  assert.equal((await fetch(`${preview.baseURL}/bundle.js`)).status, 503);
  await fs.writeFile(entry, 'globalThis.uiBuild = 3;');
  const recovered = await waitFor(
    (status) => status.hash && status.hash !== second.hash,
  );
  assert.equal(recovered.error, null);
});
