import path from 'path';
import { fileURLToPath } from 'url';

import webpack from 'webpack';

import { UserscriptPlugin } from 'webpack-userscript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (env, _args) {
  const definePlugin = new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env.GIT_HASH': JSON.stringify(env.GIT_HASH || 'unknown'),
    'process.env.BUILD_DATE': JSON.stringify(env.BUILD_DATE || 'unknown'),
    'process.env.DEVICE': JSON.stringify(env.DEVICE || 'unknown'),
  });
  const webpackUserscriptPlugin = new UserscriptPlugin({
    headers: {
      name: 'ArcaFeed-dev',
      namespace: 'https://github.com/Roharui/ArcaFeed',
      version: env.BUILD_DATE || 'unknown',
      description: 'Use ArcaLive as Shorts',
      author: 'https://github.com/Roharui',
      match: 'https://arca.live/*',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=arca.live',
      require: [
        'https://code.jquery.com/jquery-3.6.0.min.js',
        'https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js',
        env.DEVICE === 'mobile'
          ? 'https://cdn.jsdelivr.net/npm/eruda'
          : undefined,
      ],
      'run-at': 'document-end',
    },
  });

  const plugins =
    env.DEVICE === 'mobile'
      ? [definePlugin, webpackUserscriptPlugin]
      : [definePlugin];

  const config = {
    mode: 'development',
    entry: './src/index.ts',

    watch: env.DEVICE !== 'mobile',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'dist.js',
    },

    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@css': path.resolve(__dirname, 'css'),
        '@swiper': path.resolve(__dirname, 'node_modules', 'swiper'),
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
    },

    plugins,
  };

  return config;
}
