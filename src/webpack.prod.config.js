const merge = require('webpack-merge')
const webpack = require('webpack')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = function dev (self) {
  // `this` is the compiler
  const mode = 'production'
  
  return {
    mode,
    optimization: {
      minimizer: [new UglifyJsPlugin()]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify(self.mode)
        }
      })
    ]
  }
}