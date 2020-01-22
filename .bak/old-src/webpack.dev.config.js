const merge = require('webpack-merge');
const webpack = require('webpack');

module.exports = function dev(self) {
  // `this` is the compiler

  return {
    entry: {
      bundle: [
        require.resolve('./dev-refresh-client'),
        self.assetPath + '/js/index.js'
      ]
    },
    watch: true,
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          REFRESH_PORT: JSON.stringify(self.refreshPort || 0),
          NODE_ENV: JSON.stringify(self.mode)
        }
      })
    ]
  };
};
