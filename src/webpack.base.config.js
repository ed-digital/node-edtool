const path = require('path');
const webpack = require('webpack')


module.exports = function base (self) {
  // `this` is the compiler
  return {
    entry: self.assetPath+'/js/index.js',
    output: {
      path: path.join(self.outputPath, '/js'),
      filename: 'bundle.js',
      publicPath: path.join(self.outputPath, '/js/').replace(self.siteRoot, '')
    },
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: require.resolve("babel-loader"),
          options: {
            ignore: [/node_modules/, /\.min\.js/],
            sourceMaps: true,
            presets: [
              [
                require.resolve('@babel/preset-env'),
                {
                  targets: {
                    browsers: ["last 10 versions", "ie > 10"]
                  }
                },
                require.resolve('@babel/preset-react')
              ]
            ],
            plugins: [
              require.resolve('babel-plugin-import-glob'),
            ]
          }
        }
      ]
    },
    resolve: {
      alias: {
        libs: path.join(self.assetPath, '/js/libs/')
      }
    },
  }
}