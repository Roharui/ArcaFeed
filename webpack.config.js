const path = require('path')
const webpack = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: './src/index.js',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'dist.js',
        clean: true
    },

    resolve: {
        extensions: [".js"],
        alias: {
            "jquery-ui": "jquery-ui-dist/jquery-ui.js",
            "jquery-ui-css": "jquery-ui-dist/jquery-ui.css",
            "toastify-css": "toastify-js/src/toastify.css",
            "viewerjs-css": path.resolve(__dirname, "src/css/viewer.min.css"),
            "arcalive-css": path.resolve(__dirname, "src/css/arcalive.css"),
        }
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                    },
                ]
            },
            {
                test: /jquery-ui\.css$/,
                type: "asset/inline",
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                    },
                ]
            },
        ],
    },
    
    plugins: [
        new MiniCssExtractPlugin({ filename: 'app.css' }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery'",
            "window.$": "jquery"
        })
    ],
}