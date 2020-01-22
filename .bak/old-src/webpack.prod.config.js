const merge = require('webpack-merge');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;
const path = require('path');

module.exports = function dev(self) {
  // `this` is the compiler
  const mode = 'production';

  const plugins = [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(self.mode)
      }
    })
  ];

  if (self.analyze) {
    plugins.push(
      new BundleAnalyzerPlugin({
        reportFilename: path.resolve(process.cwd() + '/compile-stats.html')
      })
    );
  }

  return {
    mode,
    optimization: {
      usedExports: true,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          sourceMap: true
        })
      ]
    },
    plugins
  };
};
