const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dist.js',
    clean: true,
  },

  resolve: {
    extensions: ['.js'],
    alias: {
      'jquery-ui': 'jquery-ui-dist/jquery-ui.js',
      'jquery-ui-css': 'jquery-ui-dist/jquery-ui.css',
      'viewerjs-css': path.resolve(
        __dirname,
        'packages/viewerjs/src/css/viewer.css',
      ),
      'arcalive-css': path.resolve(__dirname, 'src/css/arcalive.css'),
      '@viewerjs': path.resolve(__dirname, 'packages/viewerjs/src'),
      src: path.resolve(__dirname, 'src'),
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
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': "jquery'",
      'window.$': 'jquery',
    }),
  ],
};
