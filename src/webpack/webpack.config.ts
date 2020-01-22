const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const WebpackMessages = require('webpack-messages')
const TerserPlugin = require('terser-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const Dotenv = require('dotenv-webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const WebpackNotifierPlugin = require('webpack-notifier')
const WorkerPlugin = require('worker-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const { StatsWriterPlugin } = require('webpack-stats-plugin')
const getEntries = require('./get-entries')

function resolveAs(name) {
  return require.resolve(name)
}

function warning(test, message) {
  if (test) {
    console.warn(message)
  }
}

const defaults = {
  open: true,
  hot: true,
  isModule: false,
  standalone: false,
}

function webpackConfig(opts) {
  const {
    root,
    mode,
    destination,
    analyse,
    name,
    open,
    hot,
    showCircular,
    clientConfig,
    isModule,
    standalone,
  } = {
    ...defaults,
    ...opts,
  }

  process.env.NODE_ENV = mode

  if (!clientConfig) {
    throw new Error(`'pkg.js' is a required file. Please add it to your project.
Example: 
  module.exports = {
    name: 'project-name'
  }
`)
  }

  const development = mode === 'development'
  const production = mode === 'production'

  const entry = getEntries({ isModule, root, name })

  const typescriptProject = entry.bundle && entry.bundle.includes('ts')

  if (typescriptProject) {
    console.log(`Using babel's typescript transpiler`)
  }

  function styleLoader(styleName) {
    return {
      test: styleName === 'sass' ? /\.(sa|sc|c)ss$/ : /\.less$/,
      use: [
        {
          loader: development
            ? resolveAs('style-loader')
            : MiniCssExtractPlugin.loader,
          options: { sourceMap: true },
        },
        {
          loader: resolveAs('css-loader'),
          options: { importLoaders: 2, sourceMap: true },
        },
        {
          loader: resolveAs('postcss-loader'),
          options: {
            ident: 'postcss',
            sourceMap: true,
            plugins: () => [require('autoprefixer')()],
          },
        },
        {
          loader: resolveAs(
            styleName === 'sass' ? 'sass-loader' : 'less-loader'
          ),
          options: { sourceMap: true },
        },
      ],
    }
  }

  function javascriptLoader() {
    return {
      test: /\.(j|t)s(x)?$/,
      loader: resolveAs('babel-loader'),
      options: {
        ignore: [/node_modules/, /node_modules[/|\\](?!gsap)/, /\.min\.js/],
        sourceMaps: true,
        presets: [
          [
            resolveAs('@babel/preset-env'),
            {
              targets: isModule
                ? {
                    node: '10',
                  }
                : {
                    browsers: ['last 10 versions', 'ie > 10'],
                  },
            },
          ],
          resolveAs('@babel/preset-react'),
          resolveAs('@babel/preset-typescript'),
        ],
        plugins: [
          resolveAs('babel-plugin-styled-components'),
          [resolveAs('@babel/plugin-proposal-decorators'), { legacy: true }],
          [
            resolveAs('@babel/plugin-proposal-class-properties'),
            { loose: true },
          ],
          resolveAs('@babel/plugin-syntax-dynamic-import'),
          resolveAs('@babel/plugin-transform-react-jsx'),
          resolveAs('@babel/plugin-transform-runtime'),
          resolveAs('babel-plugin-macros'),
          !standalone && resolveAs('react-hot-loader/babel'),
          ...((clientConfig.plugins && clientConfig.plugins.js) || []),
        ].filter(Boolean),
      },
    }
  }

  function fontLoader() {
    return {
      test: /\.(woff(2)?|ttf|eot|svg|otf)(\?v=\d+\.\d+\.\d+)?$/,
      use: [
        {
          loader: resolveAs('file-loader'),
          options: {
            name: '[name].[ext]',
            outputPath: 'fonts/',
          },
        },
      ],
    }
  }

  function imageLoader() {
    return {
      test: /\.(jpg|jpeg|png|gif)(\?v=\d+\.\d+\.\d+)?$/,
      use: [
        {
          loader: resolveAs('file-loader'),
          options: {
            name: '[name].[ext]',
            outputPath: 'images/',
          },
        },
      ],
    }
  }

  function webpLoader() {
    return {
      test: /\.(webp)(\?v=\d+\.\d+\.\d+)?$/,
      use: [
        {
          loader: resolveAs('file-loader'),
          options: {
            name: `[name].[ext]`,
            outputPath: 'images/',
          },
        },
      ],
    }
  }

  function workerLoader() {
    return {
      test: /\.worker\.(j|t)s(x)?$/,
      use: [
        {
          loader: resolveAs('worker-loader'),
        },
      ],
    }
  }

  /* Webpack for loading wasm files as urls (or base64 strings if they are small enough, I think) */
  function wasmLoader() {
    return {
      test: /\.(wasm)(\?v=\d+\.\d+\.\d+)?$/,
      type: 'javascript/auto',
      use: [
        {
          loader: resolveAs('file-loader'),
          options: {
            name: `[name].[ext]`,
            outputPath: `wasm/`,
          },
        },
      ],
    }
  }

  function vueLoader() {
    return {
      test: /\.vue$/,
      loader: resolveAs('vue-loader'),
    }
  }

  function rawLoader() {
    return {
      test: /\.txt$/,
      loader: resolveAs('raw-loader'),
    }
  }

  const config: Webpack = {
    entry: clientConfig.entry ? clientConfig.entry : entry,
    output: {
      path: destination,
      filename: development || isModule ? '[name].js' : '[chunkhash].[name].js',
      publicPath: destination
        .replace(process.cwd(), '')
        .replace(/(\\|\/)dist/, '/'),
    },
    devtool: 'source-map',
    mode,
    target: clientConfig.target || 'web',
    context: process.cwd(),
    module: {
      rules: [
        javascriptLoader(),
        styleLoader('sass'),
        styleLoader('less'),
        vueLoader(),
        imageLoader(),
        webpLoader(),
        wasmLoader(),
        workerLoader(),
        fontLoader(),
        rawLoader(),
      ].filter(Boolean),
    },
    stats: {
      all: false,
      assets: production,
      cached: false,
      colors: false,
      errors: true,
      warnings: false,
      hash: false,
      timings: true,
      performance: production,
    },
    resolve: {
      alias: {
        libs: path.resolve(path.join(root, 'lib')),
        util: path.resolve(path.join(root, 'util')),
        '~': root,
        ...(clientConfig.alias || {}),
      },
      extensions: ['.tsx', '.js', '.ts', '.vue', '.json', '.mjs'],
    },
    plugins: [
      showCircular &&
        new CircularDependencyPlugin({
          // exclude detection of files based on a RegExp
          exclude: /a\.js|node_modules/,
          // add errors to webpack instead of warnings
          failOnError: true,
          // allow import cycles that include an asyncronous import,
          // e.g. via import(/* webpackMode: "weak" */ './file.js')
          allowAsyncCycles: false,
          // set the current working directory for displaying module paths
          cwd: process.cwd(),
        }),

      production &&
        new MiniCssExtractPlugin({
          filename: '[name].bundle.css',
        }),
      new VueLoaderPlugin(),
      new Dotenv(),
      new WebpackNotifierPlugin(),
      new webpack.DefinePlugin({
        __DEV__: mode !== 'production',
      }),
      new WorkerPlugin(),
      production && new WebpackMessages(),
      production &&
        analyse &&
        new BundleAnalyzerPlugin({
          reportFilename: path.resolve(`${process.cwd()}/compile-stats.html`),
        }),
    ].filter(Boolean),
  }

  if (clientConfig.output) {
    config.output = clientConfig.output
  }

  if (production) {
    config.optimization = {
      splitChunks: {
        chunks: 'async',
        minSize: 30000,
        maxSize: 0,
        minChunks: 1,
        maxInitialRequests: 3,
        automaticNameDelimiter: '~',
        name: true,
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
      usedExports: true,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          sourceMap: true,
        }),
      ],
    }
  }

  if (development) {
    if (config.entry.bundle) {
      config.entry.bundle = [
        !standalone && resolveAs('react-hot-loader/patch'),
        !standalone && resolveAs('webpack-dev-server/client'),
        !standalone && resolveAs('webpack/hot/only-dev-server'),
        config.entry.bundle,
      ].filter(Boolean)
    }
  }

  if (clientConfig.webpack) {
    clientConfig.webpack(config, webpack)
  }

  return config
}

module.exports = webpackConfig
