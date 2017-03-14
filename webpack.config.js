var webpack = require('webpack');

module.exports = function(env) {
  const config = {
    entry: "./src/index.js",
    output: {
        path: __dirname + '/public',
        filename: "bundle.js"
    },
    plugins: [
      new webpack.ProvidePlugin({
        '_': 'underscore',
        Backbone: 'exports-loader?Backbone!' + __dirname + '/src/backboneConfig',
        '$': 'jquery',
      }),
      new webpack.IgnorePlugin(/^jquery$/),
    ],
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          loader: 'babel-loader',
          query: {
            presets: [['env', {
              targets: {
                browsers: ["last 2 versions", "safari >= 7"]
              }
            }]]
          },
        },
        { test: /backbone\.js$/, loader: 'imports-loader?define=>false' },
      ],
    },
    watch: env === 'dev',
    watchOptions: {
      aggregateTimeout: 100
    },
    devtool: env === 'dev' ? '#inline-source-map' : '',
  };

  if (env === 'prod') {
    config.plugins.push(
      new webpack.optimize.UglifyJsPlugin({minimize: true})
    );
  }

  return config;
}
