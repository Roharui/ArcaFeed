import path from 'path';
import { fileURLToPath } from 'url';

import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function(_env, _args) {
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
              loader: MiniCssExtractPlugin.loader,
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
      new MiniCssExtractPlugin({
        output: "dist.min.css"
      })
    ],
  };
}
