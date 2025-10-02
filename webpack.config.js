import path from 'path';
import { fileURLToPath } from 'url';

import HookShellScriptPlugin from 'webpack-hook-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (env, args) {
  return {
    entry: './src/index.ts',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'dist.js',
    },

    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@core': path.resolve(__dirname, 'src', 'core'),
        '@utils': path.resolve(__dirname, 'src', 'utils'),
        '@css': path.resolve(__dirname, 'css'),
        '@jqueryui': path.resolve(__dirname, 'node_modules', 'jquery-ui-dist'),
        '@swiper': path.resolve(__dirname, 'node_modules', 'swiper'),
      },
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
            },
            {
              loader: 'css-loader',
            },
          ],
        },
        {
          test: /jquery-ui\.css$/,
          type: 'asset/inline',
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
            },
          ],
        },
      ],
    },

    plugins: [
      new MiniCssExtractPlugin({
        filename: 'dist.css',
      }),
    ],
  };
}
