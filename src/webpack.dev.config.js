const merge = require('webpack-merge')
const base = require('./webpack.base.config')
const webpack = require('webpack')

module.exports = function dev (self) {
  // `this` is the compiler
  const mode = 'development'
  
  return merge(
    base(self),
    {
      watch: true,
      mode,
      plugins: [
        new webpack.DefinePlugin({
          'process.env': {
            'REFRESH_PORT': JSON.stringify(self.refreshPort || 0),
            'NODE_ENV': JSON.stringify(mode)
          }
        })
      ]
    }
  )
}