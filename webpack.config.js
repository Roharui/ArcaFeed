const path = require('path')
const webpack = require('webpack');

module.exports = {
    entry: './src/index.js',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'dist.js',
        clean: true
    },
    
    plugins: [
        new webpack.ProvidePlugin({
            "$": 'jquery',
            "jQuery": 'jquery',
        })
    ]
}