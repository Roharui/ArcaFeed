import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'node:child_process';

import webpack from 'webpack';

import { UserscriptPlugin } from 'webpack-userscript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGitHash() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

function getBuildDate() {
  return new Date().toISOString().replace('T', '_').replace(/[:.]/g, '-');
}

export default function (env = {}, _args) {
  const device = env.DEVICE || 'desktop';
  const gitHash = env.GIT_HASH || getGitHash();
  const buildDate = env.BUILD_DATE || getBuildDate();
  const definePlugin = new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env.GIT_HASH': JSON.stringify(gitHash),
    'process.env.BUILD_DATE': JSON.stringify(buildDate),
    'process.env.DEVICE': JSON.stringify(device),
  });
  const webpackUserscriptPlugin = new UserscriptPlugin({
    headers: {
      name: 'ArcaFeed-dev',
      namespace: 'https://github.com/Roharui/ArcaFeed',
      version: buildDate,
      description: 'Use ArcaLive as Shorts',
      author: 'https://github.com/Roharui',
      match: 'https://arca.live/*',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=arca.live',
      require: [
        'https://code.jquery.com/jquery-3.7.1.min.js',
        'https://cdn.jsdelivr.net/npm/swiper@12.2.0/swiper-bundle.min.js',
        'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0',
        ...(device === 'mobile'
          ? ['https://cdn.jsdelivr.net/npm/eruda@3.4.3']
          : []),
      ],
      'run-at': 'document-end',
      grant: 'none',
    },
  });

  const config = {
    mode: 'development',
    entry: './src/index.ts',

    watch: env.WATCH === 'true',
    devtool: 'inline-source-map',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'ArcaFeed.dev.js',
    },

    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@css': path.resolve(__dirname, 'css'),
      },
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
            },
          ],
        },
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },

    externals: {
      $: 'jQuery',
      jquery: 'jQuery',
      swiper: 'Swiper',
      eruda: 'eruda',
      'toastify-js': 'Toastify',
    },

    plugins: [definePlugin, webpackUserscriptPlugin],
  };

  return config;
}
