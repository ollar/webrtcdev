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
      }),
      new webpack.IgnorePlugin(/^jquery$/),
      new webpack.DefinePlugin({
        'ENV': JSON.stringify(env),
      }),
    ],
    module: {
      loaders: [
        { test: /backbone\.js$/, loader: 'imports-loader?define=>false' },
        {
          test: /\.html$/,
          include: /src\/templates/,
          loader: 'html-loader',
        },
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
