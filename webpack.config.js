var webpack = require('webpack');

module.exports = function(env) {
  const config = {
    entry: "./src/index.js",
    output: {
        path: __dirname + '/public',
        filename: "bundle.js"
    },
    plugins: [
      new webpack.DefinePlugin({
        'ENV': JSON.stringify(env),
      }),
    ],
    module: {
      loaders: [
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
