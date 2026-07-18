import path from 'path';
import { fileURLToPath } from 'url';

import { UserscriptPlugin } from 'webpack-userscript';

import { releaseUrl } from '../shared/release.js';
import config from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILENAME = 'arcafeed-series.user.js';
const currentVersion = config.version;

export default function (_env, _args) {
  return {
    mode: 'production',
    entry: './src/index.ts',

    output: {
      path: path.resolve(__dirname, '../../dist'),
      filename: FILENAME,
    },

    resolve: {
      extensions: ['.ts', '.js'],
    },

    module: {
      rules: [
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
    },

    plugins: [
      new UserscriptPlugin({
        headers: {
          name: 'ArcaFeed Series Plugin',
          namespace: 'https://github.com/Roharui/ArcaFeed',
          version: currentVersion,
          description: 'ArcaFeed series plugin - article series shortcut and series mode',
          author: 'https://github.com/Roharui',
          match: 'https://arca.live/*',
          downloadURL: releaseUrl(FILENAME),
          updateURL: releaseUrl(FILENAME),
          'run-at': 'document-end',
          require: [
            'https://code.jquery.com/jquery-3.6.0.min.js',
          ],
          grant: 'none',
        },
      }),
    ],
  };
}
