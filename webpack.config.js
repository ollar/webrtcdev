module.exports = {
  entry: "./src/index.js",
  output: {
      path: __dirname + '/public',
      filename: "bundle.js"
  },
  watch: true,
  watchOptions: {
    aggregateTimeout: 100
  },
  devtool: '#inline-source-map',
}
