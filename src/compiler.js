const chalk = require('chalk')

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const Subject = require('./Subject')

const gulp = require('gulp')
const gulpWatch = require('gulp-watch')
const less = require('gulp-less')
const sass = require('gulp-sass')
const autoprefixer = require('gulp-autoprefixer')
const sourcemaps = require('gulp-sourcemaps')
const cssnano = require('gulp-cssnano')

const { checkForUpdatesInline } = require('./check-for-updates')
const formatWebpack = require('./formatWebpack')

const DEV = 'development'
const PROD = 'production'

class Compiler extends Subject {
  constructor(opts) {
    super()

    const cwd = process.cwd()

    this.mode = opts.mode

    this.siteRoot = cwd.replace(/[\/|\\]wp-content[\/|\\].+$/, '')
    this.themePath = cwd
    this.assetPath = `${cwd}${path.sep}assets-src`
    this.outputPath = `${cwd}${path.sep}assets-built`

    if (!fileExists(this.assetPath) && fileExists(`${cwd}${path.sep}src`)) {
      this.assetPath = `${cwd}${path.sep}src`
      this.outputPath = `${cwd}${path.sep}dist`
    }

    this.silent = opts.silent
    this.analyze = opts.analyze
    this.css = getStyleType(this.assetPath)

    this.errors = {}
  }

  clearErrors(type) {
    this.errors[type] = null
  }

  addError(type, title, msg) {
    if (!this.errors[type]) this.errors[type] = []
    let err = {
      type: type,
      title: title,
      message: msg,
    }
    this.errors[type].push(err)
    this.emit('compileError', err)
    this.changed()
  }

  getErrors() {
    let errs = []
    for (let key in this.errors) {
      for (let index in this.errors[key]) {
        errs.push(this.errors[key][index])
      }
    }
    return errs
  }

  async compile() {
    if (this.css) this.compileCSS()
    if (this.mode === DEV) {
      this.watchJS()
    } else {
      this.compileJS()
    }

    if (this.mode === DEV && (await hasInternet())) {
      // Check for updates and display a nice message, but only if we're in watch mode (in case it takes a while)
      checkForUpdatesInline()
    }
    // this.compileHTML(watch);
  }

  watch() {
    return this.compile()
  }

  compileCSS() {
    const files = ['screen', 'print', 'admin', 'content-blocks']
      .map(file => `${file}.${this.css.ext}`)
      .filter(file => fs.existsSync(`${this.css.path}/${file}`))

    const compile = file => {
      const fullPath = `${this.css.path}/${file}`

      console.log(
        chalk.yellow(`>> Compiling ${this.css.type.toUpperCase()} [${file}]`)
      )

      const plumbing = gulp
        .src(fullPath)
        .pipe(sourcemaps.init())
        .pipe(
          this.css.type === 'less' ? less() : sass().on('error', sass.logError)
        )
        .pipe(autoprefixer())

      // Optionally minify css if in production mode
      if (this.mode === PROD) plumbing.pipe(cssnano())

      plumbing
        .pipe(sourcemaps.write('.'))
        .on('error', err => {
          console.log(
            chalk.black(
              chalk.bgRed(`>> ${this.css.type.toUpperCase()} Compiler Error`)
            )
          )
          console.log(err.message)

          this.addError(this.css.type, `Failed to compile ${file}`, err.message)
        })
        .pipe(
          gulp.dest(
            path.join(this.outputPath, '/css').replace(this.themePath, './')
          )
        )
        .on('end', () => {
          console.log(chalk.cyan('>> Finished compiling ' + file))
          this.changed('css')
        })
    }

    const compileAll = () => {
      this.clearErrors(this.css.type)
      for (let file of files) {
        compile(file)
      }
    }

    const self = this

    if (this.mode === DEV) {
      const watcher = gulpWatch(
        [
          this.themePath + '/**/*.css',
          this.themePath + '/**/*.scss',
          this.themePath + '/**/*.sass',
        ],
        {
          ignored: /node_modules|dist|assets-built/,
        },
        function() {
          console.log(
            chalk.magenta(
              `------- Detected changes in ${self.css.type.toUpperCase()} -------`
            )
          )
          compileAll()
        }
      )
    }

    compileAll()
  }

  hash(data) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
  }

  watchJS() {
    const compiler = this.compileDevJS()

    let watching

    this.on('done', stats => {
      if (stats.hasErrors()) {
        this.logErrors(stats)
      } else {
        console.log(
          chalk.cyan(
            '>> JS compilation completed in ' +
              (stats.endTime - stats.startTime) +
              'ms'
          )
        )
        this.changed('js')
      }
    })

    const onEnd = (_, stats) => this.emit('done', stats)

    compiler.hooks.invalid.tap('onInvalid', fileName => {
      fileName = fileName.replace(this.themePath, '')
      console.log(
        chalk.green('>> Detected changes: ') + chalk.magenta(fileName)
      )
    })

    const runWatch = () => {
      watching = compiler.watch(this.webpackConfig.watchOptions, onEnd)
    }

    compiler.hooks.done.tap('onWatchEnd', () => {
      if (!watching) {
        runWatch()
      }
    })

    runWatch()

    // Also watch for new files to auto-include
    // if (fs.existsSync("/js/widgets")) {
    //   let hash = null
    //   setInterval(() => {
    //     fs.readdir(this.assetPath + "/js/widgets", (err, files) => {
    //       const newHash = this.hash(files)
    //       if (hash !== null && hash != newHash) {
    //         console.log(
    //           chalk.green(">> Detected change in file list, recompiling")
    //         )
    //         watching.invalidate()
    //       }
    //       hash = newHash
    //     })
    //   }, 500)
    // }
  }

  compileJS() {
    const compiler = this.compileProductionJS()

    this.on('done', stats => {
      if (stats.hasErrors()) {
        this.logErrors(stats)
      } else {
        console.log(
          chalk.cyan(
            '>> JS compilation completed in ' +
              (stats.endTime - stats.startTime) +
              'ms'
          )
        )
      }
    })

    compiler.run(() => {})
  }

  compileDevJS() {
    console.log(chalk.yellow('>> Compiling JS [development]'))

    const webpack = require('webpack')
    const config = (this.webpackConfig = require('./webpack.config')(this))

    return webpack(config)
  }

  compileProductionJS() {
    console.log(chalk.yellow('>> Compiling JS [production]'))

    const webpack = require('webpack')
    const config = (this.webpackConfig = require('./webpack.config')(this))

    return webpack(config, (err, stats) => {
      this.emit('done', stats)
      const hasErrors = this.logErrors(stats)
    })
  }

  changed(jsOrCSS) {
    let change = 'css'
    if (jsOrCSS === 'js') {
      change = 'js'
    }

    clearTimeout(this._changeDebounce)
    this._changeDebounce = setTimeout(() => {
      this.emit('changed', change)
    }, 300)
  }

  logErrors(stats) {
    const { errors, warnings } = formatWebpack(stats.toJson({}, true))

    const hasErrors = errors.length
    const hasWarnings = warnings.length

    const hasWarned = hasErrors || (hasWarnings && !this.silent)

    if (hasErrors) {
      console.log(chalk.bgRed.black(`\n${padStr('ERROR')}`))
      console.log(errors.join('\n\n'))
      console.log(chalk.bgRed(padStr()))
    }
    if (hasWarnings) {
      if (this.silent) {
        console.log(
          chalk.grey(
            `${warnings.length} warning${
              warnings.length > 1 ? 's' : ''
            } hidden by silent flag`
          )
        )
      } else {
        console.log(chalk.bgYellow.black(`\n${padStr('WARNING')}`))
        console.log(warnings.join('\n\n'))

        console.log(chalk.bgYellow.black(padStr()))
      }
    }

    return hasWarned
  }
}

function fileExists(dir) {
  return fs.existsSync(dir)
}

function getStyleType(dir) {
  const less = ['less'].find(style => fileExists(`${dir}/${style}`))
  const sass = ['sass', 'scss'].find(style => fileExists(`${dir}/${style}`))

  if (sass && less) console.log(`Lol don't use less AND sass you weirdo! 😂`)

  if (sass) {
    const sassExt = ['sass', 'scss'].find(ext =>
      fileExists(`${dir}/${sass}/screen.${ext}`)
    )

    return {
      ext: sassExt,
      path: `${dir}/${sass}/`,
      type: sass,
    }
  }

  if (less) {
    return {
      ext: less,
      path: `${dir}/${less}/`,
      type: less,
    }
  }
}

function padStr(str = '', char = ' ') {
  const width = process.stdout.columns
  const w = str.length
  const colW = (width - w) / 2
  let result = char.repeat(colW) + str + char.repeat(colW)
  result = result + char.repeat(width % result.length)
  return result
}

function hasInternet() {
  return new Promise(resolve => {
    require('dns').lookup('google.com', err =>
      resolve(!(err && err.code === 'ENOTFOUND'))
    )
  })
}

module.exports = Compiler
