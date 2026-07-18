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
  });

  return {
    mode: 'development',
    entry: './src/index.ts',

    watch: true,

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'arcafeed-sample.user.js',
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
      definePlugin,
      new UserscriptPlugin({
        headers: {
          name: 'ArcaFeed Sample Plugin (dev)',
          namespace: 'https://github.com/Roharui/ArcaFeed',
          version: env.BUILD_DATE || 'unknown',
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
