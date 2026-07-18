import path from 'path';
import { fileURLToPath } from 'url';

import { UserscriptPlugin } from 'webpack-userscript';

import config from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (_env, _args) {
  const currentVersion = config.version;

  return {
    mode: 'production',
    entry: './src/index.ts',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'arcafeed-sample.user.js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.js'],
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
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
    },

    plugins: [
      new UserscriptPlugin({
        headers: {
          name: 'ArcaFeed Sample Plugin',
          namespace: 'https://github.com/Roharui/ArcaFeed',
          version: currentVersion,
          description: 'ArcaFeed sample plugin - demonstrates plugin API usage',
          author: 'https://github.com/Roharui',
          match: 'https://arca.live/*',
          'run-at': 'document-end',
          grant: 'none',
        },
      }),
    ],
  };
}
