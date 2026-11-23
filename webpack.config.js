import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
export const rootDir = path.dirname(__filename);
export const distDir = path.resolve(rootDir, 'dist');

const SHARED_REQUIRE = [
  'https://cdn.jsdelivr.net/npm/swiper@12.2.0/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0',
];

const SHARED_EXTERNALS = {
  swiper: 'Swiper',
  'toastify-js': 'Toastify',
};

export const APPLICATIONS = {
  arcafeed: {
    id: 'arcafeed',
    dir: path.resolve(rootDir, 'ArcaFeed'),
    name: 'ArcaFeed',
    devName: 'ArcaFeed-dev',
    namespace: 'https://github.com/Roharui/ArcaFeed',
    downloadURL:
      'https://github.com/Roharui/ArcaFeed/releases/latest/download/ArcaFeed.user.js',
    updateURL:
      'https://github.com/Roharui/ArcaFeed/releases/latest/download/ArcaFeed.user.js',
    description: 'Use ArcaLive as Shorts',
    match: 'https://arca.live/*',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=arca.live',
    prodFilename: 'ArcaFeed.user.js',
    devFilename: 'ArcaFeed.dev.js',
    prodExternals: SHARED_EXTERNALS,
    prodRequire: SHARED_REQUIRE,
  },
  rulifeed: {
    id: 'rulifeed',
    dir: path.resolve(rootDir, 'RuliFeed'),
    name: 'RuliFeed',
    devName: 'RuliFeed-dev',
    namespace: 'https://github.com/Roharui/RuliFeed',
    downloadURL:
      'https://github.com/Roharui/RuliFeed/releases/latest/download/RuliFeed.user.js',
    updateURL:
      'https://github.com/Roharui/RuliFeed/releases/latest/download/RuliFeed.user.js',
    description: 'Use Ruliweb as Shorts',
    match: ['https://bbs.ruliweb.com/*', 'https://m.ruliweb.com/*'],
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=bbs.ruliweb.com',
    prodFilename: 'RuliFeed.user.js',
    devFilename: 'RuliFeed.dev.js',
    prodExternals: null,
    prodRequire: null,
  },
};

export function resolveApps(appArg) {
  if (!appArg || appArg === 'all') {
    return [APPLICATIONS.arcafeed, APPLICATIONS.rulifeed];
  }
  const key = String(appArg).toLowerCase();
  const app = APPLICATIONS[key];
  if (!app) {
    throw new Error(
      `Unknown APP "${appArg}". Expected one of: all, arcafeed, rulifeed.`,
    );
  }
  return [app];
}

function loadAppTooling(app) {
  const requireFromApp = createRequire(path.join(app.dir, 'package.json'));
  const webpack = requireFromApp('webpack');
  const { UserscriptPlugin } = requireFromApp('webpack-userscript');
  const pkg = requireFromApp('./package.json');
  return { webpack, UserscriptPlugin, pkg };
}

function getGitHash(cwd = rootDir) {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

function getBuildDate() {
  return new Date().toISOString().replace('T', '_').replace(/[:.]/g, '-');
}

export function getDevHeaders(appOrId, version) {
  const app =
    typeof appOrId === 'string'
      ? resolveApps(appOrId)[0]
      : appOrId || APPLICATIONS.arcafeed;
  return {
    name: app.devName,
    namespace: app.namespace,
    version,
    description: app.description,
    author: 'https://github.com/Roharui',
    match: app.match,
    icon: app.icon,
    require: SHARED_REQUIRE,
    'run-at': 'document-start',
    grant: 'none',
  };
}

function createCommonResolveAndLoaders(app, { minifyCss = false } = {}) {
  const cssLoaders = [
    { loader: 'style-loader' },
    { loader: 'css-loader' },
    ...(minifyCss
      ? [{ loader: path.resolve(app.dir, 'scripts/css-minify-loader.cjs') }]
      : []),
  ];

  return {
    context: app.dir,
    entry: './src/index.ts',
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [path.resolve(app.dir, 'node_modules'), 'node_modules'],
      alias: {
        '@': path.resolve(app.dir, 'src'),
        '@css': path.resolve(app.dir, 'css'),
      },
    },
    resolveLoader: {
      modules: [path.resolve(app.dir, 'node_modules'), 'node_modules'],
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: cssLoaders,
        },
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              allowTsInNodeModules: true,
              configFile: path.resolve(app.dir, 'tsconfig.json'),
            },
          },
          exclude: /node_modules\/(?!@feed\/core)/,
        },
      ],
    },
  };
}

function buildProdConfig(app) {
  const { UserscriptPlugin, pkg } = loadAppTooling(app);
  const headers = {
    name: app.name,
    namespace: app.namespace,
    downloadURL: app.downloadURL,
    updateURL: app.updateURL,
    version: pkg.version,
    description: app.description,
    author: 'https://github.com/Roharui',
    match: app.match,
    icon: app.icon,
    ...(app.prodRequire ? { require: app.prodRequire } : {}),
    'run-at': 'document-start',
    grant: 'none',
  };

  return {
    name: app.id,
    mode: 'production',
    cache: {
      type: 'filesystem',
      name: `${app.id}-prod`,
      cacheDirectory: path.resolve(app.dir, '.cache/webpack'),
      buildDependencies: {
        config: [__filename, path.resolve(app.dir, 'package.json')],
      },
    },
    ...createCommonResolveAndLoaders(app, { minifyCss: true }),
    output: {
      path: distDir,
      filename: app.prodFilename,
    },
    ...(app.prodExternals ? { externals: app.prodExternals } : {}),
    plugins: [new UserscriptPlugin({ headers })],
  };
}

function buildDevConfig(app, env = {}) {
  const { webpack, UserscriptPlugin } = loadAppTooling(app);
  const device = env.DEVICE || 'desktop';
  const gitHash = env.GIT_HASH || getGitHash(app.dir);
  const buildDate = env.BUILD_DATE || getBuildDate();

  const definePlugin = new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env.GIT_HASH': JSON.stringify(gitHash),
    'process.env.BUILD_DATE': JSON.stringify(buildDate),
    'process.env.DEVICE': JSON.stringify(device),
    'process.env.VERSION_RELOAD': JSON.stringify(env.VERSION_RELOAD || 'true'),
  });

  const headers = getDevHeaders(app, buildDate);
  const bundleDeps = env.BUNDLE === 'true';
  if (bundleDeps) {
    delete headers.require;
  }

  return {
    name: app.id,
    mode: 'development',
    cache: {
      type: 'filesystem',
      name: `${app.id}-dev`,
      cacheDirectory: path.resolve(app.dir, '.cache/webpack'),
      buildDependencies: {
        config: [__filename],
      },
    },
    ...createCommonResolveAndLoaders(app, { minifyCss: false }),
    watch: env.WATCH === 'true',
    devtool: env.LIVE ? false : 'inline-source-map',
    ...(env.LIVE ? { optimization: { minimize: true } } : {}),
    output: {
      path: distDir,
      filename: app.devFilename,
    },
    ...(bundleDeps ? {} : { externals: SHARED_EXTERNALS }),
    plugins: [definePlugin, new UserscriptPlugin({ headers })],
  };
}

export function createDevConfig(env = {}) {
  const apps = resolveApps(env.APP);
  const configs = apps.map((app) => buildDevConfig(app, env));
  return env.APP && env.APP !== 'all' ? configs[0] : configs;
}

export default function createWebpackConfig(env = {}, args = {}) {
  const isProd =
    args.mode === 'production' ||
    env.PROD === 'true' ||
    env.PROD === true ||
    env.MODE === 'production';
  const apps = resolveApps(env.APP);
  const configs = apps.map((app) =>
    isProd ? buildProdConfig(app) : buildDevConfig(app, env),
  );
  return env.APP && env.APP !== 'all' ? configs[0] : configs;
}
