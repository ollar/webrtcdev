var webpack = require('webpack');
var args = process.argv.slice(2);

var env = args[0] === '--prod' ? 'prod' : 'dev';

module.exports = {
  entry: "./src/index.js",
  output: {
      path: __dirname + '/public',
      filename: "bundle.js"
  },
  plugins: [
    new webpack.ProvidePlugin({
      '_': 'underscore',
      // Backbone: 'backbone',
      Backbone: 'exports?Backbone!' + __dirname + '/src/backboneConfig',
      '$': 'jquery',
    }),
    new webpack.IgnorePlugin(/^jquery$/),
  ],
  module: {
    loaders: [
      { test: /backbone\.js$/, loader: 'imports-loader?define=>false' },
    ],
  },
  watch: env === 'dev',
  watchOptions: {
    aggregateTimeout: 100
  },
  devtool: env === 'dev' ? '#inline-source-map' : null,
}
