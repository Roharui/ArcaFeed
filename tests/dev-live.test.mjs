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
    jQuery: { version: 'fixture' },
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
    code: 'globalThis.loaded = jQuery.version;',
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

test('mobile loader grants its PC address and includes the mobile debugger', () => {
  const source = createDevLoader('http://100.64.1.2:3000', 'mobile');
  assert.match(source, /@connect 100\.64\.1\.2/);
  assert.match(
    source,
    /@require https:\/\/cdn\.jsdelivr\.net\/npm\/eruda@3\.4\.3/,
  );
  assert.ok(source.includes('http://100.64.1.2:3000'));
});

for (const transport of ['auto', 'fetch']) {
  test(`${transport} loader can use HTTPS fetch without relying on GM APIs`, async () => {
    const requests = [];
    const timers = [];
    let reloads = 0;
    const context = vm.createContext({
      fetch: (url, options) =>
        new Promise((resolve, reject) =>
          requests.push({ url, options, resolve, reject }),
        ),
      AbortSignal: { timeout: () => 'timeout-signal' },
      setTimeout: (callback) => timers.push(callback),
      window: { location: { reload: () => reloads++ } },
      console: { info() {}, warn() {}, error: assert.fail },
      jQuery: { version: 'fetch-fixture' },
      ...(transport === 'fetch'
        ? { GM_xmlhttpRequest: () => assert.fail('GM must not be used') }
        : {}),
    });
    const source = createDevLoader(
      'https://pc.example.ts.net/n/',
      'mobile',
      transport,
    );
    if (transport === 'fetch') {
      assert.match(source, /@grant none/);
      assert.doesNotMatch(source, /@connect /);
    }
    vm.runInContext(source, context);
    assert.match(
      requests[0].url,
      /^https:\/\/pc\.example\.ts\.net\/n\/build\?/,
    );
    assert.equal(requests[0].options.credentials, 'omit');
    assert.equal(requests[0].options.cache, 'no-store');
    requests.shift().reject(new Error('offline'));
    await new Promise((resolve) => setImmediate(resolve));
    timers.shift()();
    requests.shift().resolve({
      status: 200,
      text: async () =>
        JSON.stringify({
          hash: 'first',
          code: 'globalThis.loaded = jQuery.version;',
        }),
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(context.loaded, 'fetch-fixture');
    timers.shift()();
    requests.shift().resolve({
      status: 200,
      text: async () => JSON.stringify({ hash: 'second', code: '' }),
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(reloads, 1);
    assert.equal(timers.length, 0);
  });
}

test('fetch loader rejects an HTTP endpoint before making mixed-content requests', () => {
  const errors = [];
  const context = vm.createContext({
    fetch: () => assert.fail('HTTP must not be requested'),
    setTimeout: () => assert.fail('Invalid configuration must not retry'),
    console: { error: (error) => errors.push(error) },
  });
  vm.runInContext(
    createDevLoader('http://100.64.1.2:3000', 'mobile', 'fetch'),
    context,
  );
  assert.match(errors[0], /HTTPS/);
});

test('live server serves uncached builds, rebuilds on save, and withholds failed compilations', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'arcafeed-live-'));
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
  const loader = await fetch(`${live.baseURL}/ArcaFeed.live.user.js`);
  const source = await loader.text();
  assert.match(source, /@grant GM_xmlhttpRequest/);
  assert.match(source, /@connect 127\.0\.0\.1/);
  assert.ok(source.includes(live.baseURL));
  const phoneSource = await new Promise((resolve, reject) => {
    http
      .get(
        `${live.baseURL}/ArcaFeed.live.user.js`,
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
    headers: { Origin: 'https://arca.live' },
  });
  assert.equal(
    allowed.headers.get('access-control-allow-origin'),
    'https://arca.live',
  );
  const denied = await fetch(`${live.baseURL}/build`, {
    headers: { Origin: 'https://example.com' },
  });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  const preflight = await fetch(`${live.baseURL}/build`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://arca.live',
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

test('fetch loader retains its HTTPS proxy path with or without upstream prefix rewriting', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'arcafeed-https-'));
  const entry = path.join(directory, 'entry.js');
  await fs.writeFile(entry, 'globalThis.liveBuild = 1;');
  let live = null;
  t.after(async () => {
    await live?.close();
    await fs.rm(directory, { recursive: true, force: true });
  });
  live = await startDevServer({
    port: 0,
    publicURL: 'https://pc.example.ts.net/n/',
    device: 'mobile',
    config: {
      mode: 'development',
      entry,
      output: { path: directory, filename: 'bundle.js' },
    },
  });
  for (const prefix of ['', '/n']) {
    const response = await fetch(
      `${live.baseURL}${prefix}/ArcaFeed.fetch.user.js`,
    );
    const source = await response.text();
    assert.ok(source.includes('https://pc.example.ts.net/n'));
    assert.equal(source.includes('https://pc.example.ts.net/n/"'), false);
    assert.equal(source.includes(live.baseURL), false);
    assert.match(source, /@grant none/);
    const build = await fetch(`${live.baseURL}${prefix}/build?hash=old`, {
      headers: { Origin: 'https://arca.live' },
    });
    assert.equal(build.status, 200);
    assert.equal(
      build.headers.get('access-control-allow-origin'),
      'https://arca.live',
    );
    assert.ok(Object.hasOwn(await build.json(), 'hash'));
    const preflight = await fetch(`${live.baseURL}${prefix}/build`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://arca.live' },
    });
    assert.equal(preflight.status, 204);
  }
});
