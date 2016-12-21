var webpack = require('webpack');

module.exports = {
  entry: "./src/index.js",
  output: {
      path: __dirname + '/public',
      filename: "bundle.js"
  },
  plugins: [
    new webpack.ProvidePlugin({
      '_': 'underscore',
      Backbone: 'backbone',
      '$': 'jquery',
    }),
  ],
  watch: true,
  watchOptions: {
    aggregateTimeout: 100
  },
  devtool: '#inline-source-map',
}
