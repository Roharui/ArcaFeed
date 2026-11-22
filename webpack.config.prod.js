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
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename, path.resolve(__dirname, 'package.json')],
      },
    },
    entry: './src/index.ts',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'RuliFeed.user.js',
      clean: true,
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
            {
              loader: path.resolve(__dirname, 'scripts/css-minify-loader.cjs'),
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
          name: 'RuliFeed',
          namespace: 'https://github.com/Roharui/RuliFeed',
          downloadURL:
            'https://github.com/Roharui/RuliFeed/releases/latest/download/RuliFeed.user.js',
          updateURL:
            'https://github.com/Roharui/RuliFeed/releases/latest/download/RuliFeed.user.js',
          version: currentVersion,
          description: 'Use Ruliweb as Shorts',
          author: 'https://github.com/Roharui',
          match: ['https://bbs.ruliweb.com/*', 'https://m.ruliweb.com/*'],
          icon: 'https://www.google.com/s2/favicons?sz=64&domain=bbs.ruliweb.com',
          'run-at': 'document-start',
          grant: 'none',
        },
      }),
    ],
  };
}
