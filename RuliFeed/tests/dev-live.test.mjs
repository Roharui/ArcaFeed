import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { setTimeout as delay } from 'node:timers/promises';
import { createDevLoader } from '../scripts/dev-loader.mjs';
import { startDevServer } from '../scripts/dev-server.mjs';
import { UserscriptPlugin } from 'webpack-userscript';

function loaderFixture() {
  const requests = [];
  const timers = [];
  const errors = [];
  let reloads = 0;
  const context = vm.createContext({
    GM_xmlhttpRequest: (request) => requests.push(request),
    setTimeout: (callback) => timers.push(callback),
    window: { location: { reload: () => reloads++ } },
    console: { info() {}, warn() {}, error: (error) => errors.push(error) },
    fixtureDependency: { version: 'fixture' },
  });
  vm.runInContext(createDevLoader('http://127.0.0.1:3000'), context);
  return {
    context,
    requests,
    timers,
    errors,
    get reloads() {
      return reloads;
    },
    respond(build) {
      requests.shift().onload({
        status: 200,
        responseText: JSON.stringify(build),
      });
    },
    poll() {
      timers.shift()();
    },
  };
}

test('live loader executes once with @require globals and reloads only on a new build', () => {
  const loader = loaderFixture();
  loader.respond({ hash: null });
  loader.poll();
  loader.respond({
    hash: 'first',
    code: 'globalThis.loaded = fixtureDependency.version;',
  });
  assert.equal(loader.context.loaded, 'fixture');
  loader.poll();
  loader.respond({ hash: 'first' });
  assert.equal(loader.reloads, 0);
  loader.poll();
  assert.match(loader.requests[0].url, /hash=first&/);
  loader.respond({ hash: null }); // Building or a failed compilation.
  loader.poll();
  loader.respond({ hash: 'second', code: 'throw new Error("must reload");' });
  assert.equal(loader.reloads, 1);
  assert.equal(loader.timers.length, 0);
  assert.equal(loader.errors.length, 0);
});

test('live loader retries an offline server and can recover from a runtime error', () => {
  const loader = loaderFixture();
  loader.requests.shift().onerror(new Error('offline'));
  loader.poll();
  loader.requests.shift().onload({ status: 503 });
  loader.poll();
  loader.requests.shift().onload({ status: 200, responseText: 'invalid json' });
  loader.poll();
  loader.respond({
    hash: 'broken',
    code: 'throw new Error("runtime failure");',
  });
  assert.equal(loader.errors.length, 1);
  loader.poll();
  loader.respond({ hash: 'fixed', code: '' });
  assert.equal(loader.reloads, 1);
});

test('loader grants its PC address and starts with the document', () => {
  const source = createDevLoader('http://100.64.1.2:3000');
  assert.match(source, /@connect 100\.64\.1\.2/);
  assert.match(source, /@run-at document-start/);
  assert.doesNotMatch(source, /@require .*eruda/);
  assert.ok(source.includes('http://100.64.1.2:3000'));
});

test('live server serves uncached builds, rebuilds on save, and withholds failed compilations', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rulifeed-live-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const entry = path.join(directory, 'entry.js');
  await fs.writeFile(entry, 'globalThis.liveBuild = 1;');
  let failedCompilation = false;
  const live = await startDevServer({
    port: 0,
    config: {
      mode: 'development',
      entry,
      output: { path: directory, filename: 'bundle.js' },
      plugins: [
        new UserscriptPlugin({
          headers: { name: 'Live test', version: '1.0.0' },
        }),
        {
          apply(compiler) {
            compiler.hooks.done.tap('ObserveFailure', (stats) => {
              failedCompilation = stats.hasErrors();
            });
          },
        },
      ],
    },
  });
  t.after(() => live.close());
  const getBuild = async (hash = '') => {
    const response = await fetch(`${live.baseURL}/build?hash=${hash}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response.json();
  };
  async function waitFor(check) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const build = await getBuild();
      if (check(build)) return build;
      await delay(25);
    }
    assert.fail('Timed out waiting for webpack watch');
  }
  const loader = await fetch(`${live.baseURL}/RuliFeed.live.user.js`);
  const source = await loader.text();
  assert.match(source, /@grant GM_xmlhttpRequest/);
  assert.match(source, /@connect 127\.0\.0\.1/);
  assert.ok(source.includes(live.baseURL));
  const phoneSource = await new Promise((resolve, reject) => {
    http
      .get(
        `${live.baseURL}/RuliFeed.live.user.js`,
        { headers: { Host: '100.64.1.2:3000' } },
        (response) => {
          let source = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => (source += chunk));
          response.on('end', () => resolve(source));
          response.on('error', reject);
        },
      )
      .on('error', reject);
  });
  assert.match(phoneSource, /@connect 100\.64\.1\.2/);
  assert.ok(phoneSource.includes('http://100.64.1.2:3000'));
  assert.equal(phoneSource.includes(live.baseURL), false);
  const allowed = await fetch(`${live.baseURL}/build`, {
    headers: { Origin: 'https://bbs.ruliweb.com' },
  });
  assert.equal(
    allowed.headers.get('access-control-allow-origin'),
    'https://bbs.ruliweb.com',
  );
  const denied = await fetch(`${live.baseURL}/build`, {
    headers: { Origin: 'https://example.com' },
  });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  const preflight = await fetch(`${live.baseURL}/build`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://bbs.ruliweb.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Private-Network': 'true',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get('access-control-allow-private-network'),
    'true',
  );
  const deniedPreflight = await fetch(`${live.baseURL}/build`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://example.com' },
  });
  assert.equal(deniedPreflight.status, 403);
  const first = await waitFor((build) => build.hash);
  assert.match(first.code, /liveBuild = 1/);
  const compressed = await fetch(`${live.baseURL}/build`, {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  assert.equal(compressed.headers.get('content-encoding'), 'gzip');
  assert.deepEqual(await compressed.json(), first);
  assert.deepEqual(await getBuild(first.hash), { hash: first.hash });
  await fs.writeFile(entry, 'globalThis.liveBuild = 2;');
  const second = await waitFor(
    (build) => build.hash && build.hash !== first.hash,
  );
  assert.match(second.code, /liveBuild = 2/);
  await fs.writeFile(entry, 'globalThis.liveBuild = ;');
  await waitFor((build) => failedCompilation && build.hash === null);
  await fs.writeFile(entry, 'globalThis.liveBuild = 3;');
  const third = await waitFor(
    (build) => build.hash && build.hash !== second.hash,
  );
  assert.match(third.code, /liveBuild = 3/);
});
