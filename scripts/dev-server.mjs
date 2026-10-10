import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import createDevConfig from '../webpack.config.dev.js';
import { createDevLoader, normalizeDevURL } from './dev-loader.mjs';

export async function startDevServer({
  port = 3000,
  host = '127.0.0.1',
  publicURL,
  device = 'desktop',
  config = createDevConfig({ DEVICE: device }),
} = {}) {
  let build = null;
  const externalURL = publicURL ? normalizeDevURL(publicURL) : null;
  const configuredPath = externalURL
    ? new URL(externalURL).pathname.replace(/\/+$/, '')
    : '';
  const prefixes = [...new Set([configuredPath, '/n'].filter(Boolean))];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, baseURL);
    // nginx may preserve the location prefix or remove it via proxy_pass.
    const prefix =
      prefixes.find((path) => url.pathname.startsWith(`${path}/`)) || '';
    const route = url.pathname.slice(prefix.length);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vary', 'Origin');
    const allowedOrigin = request.headers.origin === 'https://arca.live';
    if (allowedOrigin) {
      response.setHeader('Access-Control-Allow-Origin', 'https://arca.live');
    }
    if (request.method === 'OPTIONS') {
      if (route === '/build' && allowedOrigin) {
        response.setHeader('Access-Control-Allow-Methods', 'GET');
        if (
          request.headers['access-control-request-private-network'] === 'true'
        ) {
          response.setHeader('Access-Control-Allow-Private-Network', 'true');
        }
        response.writeHead(204);
      } else {
        response.writeHead(403);
      }
      response.end();
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET, OPTIONS' });
      response.end();
      return;
    }
    if (
      route === '/ArcaFeed.live.user.js' ||
      route === '/ArcaFeed.fetch.user.js'
    ) {
      response.setHeader(
        'Content-Type',
        'application/javascript; charset=utf-8',
      );
      // Use the address the phone opened, including Tailscale IP or MagicDNS.
      const loaderURL =
        externalURL ||
        `${new URL(`http://${request.headers.host}`).origin}${prefix}`;
      response.end(
        createDevLoader(
          loaderURL,
          device,
          route === '/ArcaFeed.fetch.user.js' ? 'fetch' : 'auto',
        ),
      );
    } else if (route === '/build') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(
        JSON.stringify(
          !build || url.searchParams.get('hash') === build.hash
            ? { hash: build?.hash ?? null }
            : build,
        ),
      );
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = host === '0.0.0.0' ? '127.0.0.1' : host;
  const baseURL = `http://${address.includes(':') ? `[${address}]` : address}:${server.address().port}`;

  let compiler;
  let watcher;
  try {
    compiler = webpack(config);
    compiler.hooks.invalid.tap('ArcaFeedLive', () => {
      build = null;
    });
    watcher = compiler.watch({}, (error, stats) => {
      if (error || stats.hasErrors()) {
        build = null;
        console.error(error || stats.toString({ all: false, errors: true }));
        return;
      }
      // UserscriptPlugin renames the emitted file to *.user.js.
      const filename = [...stats.compilation.entrypoints.values()][0]
        .getFiles()
        .find((file) => file.endsWith('.js'));
      const code = readFileSync(
        path.join(stats.compilation.outputOptions.path, filename),
        'utf8',
      );
      build = { hash: stats.hash, code };
      console.log(`[ArcaFeed live] 빌드 완료 (${stats.hash})`);
    });
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    throw error;
  }

  return {
    baseURL,
    async close() {
      await new Promise((resolve, reject) =>
        watcher.close((error) => (error ? reject(error) : resolve())),
      );
      await new Promise((resolve, reject) =>
        compiler.close((error) => (error ? reject(error) : resolve())),
      );
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host =
    process.env.HOST ||
    (process.argv.includes('--network') ? '0.0.0.0' : '127.0.0.1');
  const live = await startDevServer({
    port: Number(process.env.PORT || 3000),
    host,
    publicURL: process.env.DEV_URL,
    device: process.argv.includes('--mobile') ? 'mobile' : 'desktop',
  });
  console.log(
    `[ArcaFeed live] 한 번 설치: ${live.baseURL}/ArcaFeed.live.user.js\n` +
      '[ArcaFeed live] 기존 ArcaFeed/ArcaFeed-dev를 끄고 아카라이브를 열어주세요. 저장 시 자동 새로고침됩니다.',
  );
  if (host !== '127.0.0.1') {
    console.log(
      `[ArcaFeed live] 휴대폰에서 설치: http://<PC 주소>:${new URL(live.baseURL).port}/ArcaFeed.live.user.js`,
    );
  }
  if (process.env.DEV_URL) {
    const externalURL = normalizeDevURL(process.env.DEV_URL);
    console.log(
      `[ArcaFeed live] GM API 없는 로더: ${externalURL}/ArcaFeed.fetch.user.js (HTTPS 필요)`,
    );
  }
  const stop = async () => {
    await live.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
