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
      Backbone: 'backbone',
      '$': 'jquery',
    }),
  ],
  watch: env === 'dev',
  watchOptions: {
    aggregateTimeout: 100
  },
  devtool: env === 'dev' ? '#inline-source-map' : null,
}
