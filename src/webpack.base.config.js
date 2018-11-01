module.exports = function base (self) {
  const path = require('path')
  const MiniCssExtractPlugin = require("mini-css-extract-plugin")

  const POST_CSS_OPTS = {
    ident: 'postcss',
    sourceMap: true,
    plugins: (loader) => [
      require('autoprefixer')(),
    ]
  }
  
  return {
    entry: self.assetPath+'/js/index.js',
    output: {
      path: path.join(self.outputPath, '/js'),
      filename: 'bundle.js',
      publicPath: path.join(self.outputPath, '/js/').replace(self.siteRoot, '')
    },
    devtool: 'source-map',
    mode: self.mode,
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
              require.resolve('@babel/plugin-proposal-class-properties'),
              require.resolve('@babel/plugin-syntax-dynamic-import')
            ]
          }
        },
        {
          test: /\.less$/,
          use: [
            { loader: MiniCssExtractPlugin.loader, },
            { loader: require.resolve('css-loader'), options: {importLoaders: 2, sourceMap: true} },
            { loader: require.resolve('postcss-loader'), options: POST_CSS_OPTS },
            { loader: require.resolve('less-loader'), options: {sourceMap: true} }
          ]
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            { loader: require.resolve('css-loader'), options: {importLoaders: 2, sourceMap: true}},
            { loader: require.resolve('postcss-loader'), options: POST_CSS_OPTS },
            { loader: require.resolve('sass-loader'), options: {sourceMap: true}}
          ]
        },
      ]
    },
    resolve: {
      alias: {
        libs: path.join(self.assetPath, '/js/libs/')
      }
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].bundle.css',
      }),
    ]
  }
}