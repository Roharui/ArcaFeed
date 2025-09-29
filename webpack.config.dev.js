const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/index.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dist.js',
  },

  resolve: {
    extensions: ['.js'],
    alias: {
      'jquery-ui': 'jquery-ui-dist/jquery-ui.js',
      'jquery-ui-css': 'jquery-ui-dist/jquery-ui.css',
      'arcalive-css': path.resolve(__dirname, 'src/css/arcalive.css'),
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
