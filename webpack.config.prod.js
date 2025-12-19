import path from 'path';
import { fileURLToPath } from 'url';

import { UserscriptPlugin } from 'webpack-userscript';

import config from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (env, _args) {
  const currentVersion = env.BUILD_DATE ?? config.version;

  return {
    entry: './src/index.ts',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'dist.user.js',
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

    plugins: [
      new UserscriptPlugin({
        headers: {
          name: 'ArcaFeed',
          namespace: 'https://github.com/Roharui/ArcaFeed',
          version: currentVersion,
          description: 'Use ArcaLive as Shorts',
          author: 'https://github.com/Roharui',
          match: 'https://arca.live/*',
          icon: 'https://www.google.com/s2/favicons?sz=64&domain=arca.live',
        },
      }),
    ],
  };
}
