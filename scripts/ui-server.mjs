import http from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import createDevConfig from '../webpack.config.dev.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiRoot = path.join(root, 'scripts/ui');

export function createUiConfig() {
  const config = createDevConfig();
  return {
    ...config,
    context: root,
    entry: path.join(uiRoot, 'fixture.mjs'),
    cache: false,
    devtool: 'inline-source-map',
    output: {
      path: path.join(root, '.cache/ui-preview'),
      filename: 'bundle.js',
    },
    externals: {},
    // Bundle dependencies locally; no userscript extension or CDN is needed.
    plugins: config.plugins.filter(
      (plugin) => plugin instanceof webpack.DefinePlugin,
    ),
    module: {
      rules: config.module.rules.map((rule) =>
        rule.test.test('.ts')
          ? {
              ...rule,
              use: { loader: 'ts-loader', options: { transpileOnly: true } },
            }
          : rule,
      ),
    },
  };
}

export async function startUiServer({
  port = 4317,
  config = createUiConfig(),
  resultsDirectory = path.join(root, '.cache/ui-results'),
  onBuild = (status) => {
    if (status.error) console.error(status.error);
    else console.log(`[ArcaFeed UI] 빌드 완료 (${status.hash})`);
  },
} = {}) {
  mkdirSync(resultsDirectory, { recursive: true });
  const reportPath = path.join(resultsDirectory, 'report.json');
  let status = { hash: null, builtAt: null, building: true, error: null };
  let bundle = null;
  const server = http.createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/results' && request.method === 'POST') {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) request.destroy();
      });
      request.on('end', () => {
        try {
          const report = JSON.parse(body);
          if (!Array.isArray(report.failures))
            throw new Error('Expected a test report');
          writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ reportPath }));
        } catch (error) {
          response.writeHead(400);
          response.end(String(error));
        }
      });
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end();
      return;
    }
    if (url.pathname === '/status') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ ...status, resultsDirectory }));
    } else if (url.pathname === '/results') {
      response.setHeader('Content-Type', 'application/json');
      if (!existsSync(reportPath)) {
        response.writeHead(404);
        response.end(JSON.stringify({ message: 'No browser test report yet' }));
      } else response.end(readFileSync(reportPath));
    } else if (url.pathname === '/bundle.js') {
      response.setHeader('Content-Type', 'application/javascript');
      if (!bundle) {
        response.writeHead(503);
        response.end(
          'throw new Error("UI preview is building; check /status");',
        );
      } else {
        response.setHeader('X-ArcaFeed-Build', status.hash);
        response.end(bundle);
      }
    } else if (url.pathname === '/' || url.pathname === '/fixture') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      const filename = url.pathname === '/' ? 'index.html' : 'fixture.html';
      response.end(
        readFileSync(path.join(uiRoot, filename), 'utf8').replace(
          '{{BUILD_HASH}}',
          status.hash ?? '',
        ),
      );
    } else if (
      url.pathname === '/preview.mjs' ||
      url.pathname === '/preview.css'
    ) {
      response.setHeader(
        'Content-Type',
        url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript',
      );
      response.end(readFileSync(path.join(uiRoot, url.pathname.slice(1))));
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  let compiler;
  let watcher;
  try {
    compiler = webpack(config);
    compiler.hooks.invalid.tap('ArcaFeedUi', () => {
      bundle = null;
      status = { ...status, hash: null, building: true, error: null };
    });
    watcher = compiler.watch({}, (error, stats) => {
      if (error || stats.hasErrors()) {
        bundle = null;
        status = {
          hash: null,
          builtAt: null,
          building: false,
          error: String(error || stats.toString({ all: false, errors: true })),
        };
      } else {
        const filename = [...stats.compilation.entrypoints.values()][0]
          .getFiles()
          .find((file) => file.endsWith('.js'));
        bundle = readFileSync(
          path.join(stats.compilation.outputOptions.path, filename),
        );
        status = {
          hash: stats.hash,
          builtAt: new Date().toISOString(),
          building: false,
          error: null,
        };
      }
      onBuild(status);
    });
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    if (compiler) await new Promise((resolve) => compiler.close(resolve));
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
  const preview = await startUiServer({
    port: Number(process.env.PORT || 4317),
  });
  console.log(`[ArcaFeed UI] ${preview.baseURL} (소스 변경 시 자동 갱신)`);
  const stop = async () => {
    await preview.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
