module.exports = function base(self) {
  const path = require('path')
  const fs = require('fs')
  const MiniCssExtractPlugin = require('mini-css-extract-plugin')
  const VueLoaderPlugin = require('vue-loader/lib/plugin')

  const POST_CSS_OPTS = {
    ident: 'postcss',
    sourceMap: true,
    plugins:
      self.mode !== 'production'
        ? loader => [require('autoprefixer')()]
        : loader => [require('autoprefixer')()],
  }

  const entry = { bundle: self.assetPath + '/js/index.js' }
  const adminPath = path.resolve(self.assetPath + '/js/admin.js')

  if (fs.existsSync(adminPath)) {
    entry.admin = adminPath
  }

  return {
    entry,
    output: {
      path: path.join(self.outputPath, '/js'),
      filename: '[name].js',
      publicPath: path.join(self.outputPath, '/js/').replace(self.siteRoot, ''),
    },
    devtool: 'source-map',
    mode: self.mode,
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: require.resolve('babel-loader'),
          options: {
            ignore: [/node_modules[\/|\\](?!gsap)/, /\.min\.js/],
            sourceMaps: true,
            presets: [
              [
                require.resolve('@babel/preset-env'),
                {
                  targets: {
                    browsers: ['last 10 versions', 'ie > 10'],
                  },
                },
                require.resolve('@babel/preset-react'),
              ],
            ],
            plugins: [
              require.resolve('babel-plugin-import-glob'),
              require.resolve('@babel/plugin-proposal-class-properties'),
              require.resolve('@babel/plugin-syntax-dynamic-import'),
              require.resolve('@babel/plugin-transform-react-jsx'),
            ],
          },
        },
        {
          test: /\.less$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            {
              loader: require.resolve('css-loader'),
              options: { importLoaders: 2, sourceMap: true },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: POST_CSS_OPTS,
            },
            {
              loader: require.resolve('less-loader'),
              options: {
                sourceMap: true,
              },
            },
          ],
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            {
              loader: require.resolve('css-loader'),
              options: { importLoaders: 2, sourceMap: true },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: POST_CSS_OPTS,
            },
            {
              loader: require.resolve('sass-loader'),
              options: { sourceMap: true },
            },
          ],
        },
        {
          test: /\.vue$/,
          loader: require.resolve('vue-loader'),
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts', '.mjs', '.vue'],
      alias: {
        libs: path.join(self.assetPath, '/js/libs/'),
        '~': path.join(self.assetPath, '/js'),
      },
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].bundle.css',
      }),
      new VueLoaderPlugin(),
    ],
  }
}
