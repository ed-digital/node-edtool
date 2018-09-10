const chalk = require('chalk');


const fs = require('fs');
const path = require('path');
const crypto = require('crypto')

const EventEmitter = require('events').EventEmitter;

const gulp = require('gulp');
const gulpWatch = require('gulp-watch');
const less = require('gulp-less');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const checkForUpdates = require('./check-for-updates')


class Compiler extends EventEmitter {

	constructor() {
    super();

    const cwd = process.cwd()

    this.siteRoot = cwd.replace(/\/wp-content\/.+$/, '')
    this.themePath = cwd
    this.assetPath = `${cwd}/assets-src`
    this.outputPath = `${cwd}/assets-built`

    if (!fileExists(this.assetPath) && fileExists(`${cwd}/src`)) {
      this.assetPath = `${cwd}/src`
      this.outputPath = `${cwd}/dist`
    }

    this.css = getStyleType(this.assetPath)

		this.errors = {};

	}

	clearErrors(type) {
		this.errors[type] = null;
	}

	addError(type, title, msg) {
		if(!this.errors[type]) this.errors[type] = [];
		let err = {
			type: type,
			title: title,
			message: msg
		};
		this.errors[type].push(err);
		this.emit('compileError', err);
		this.changed();
	}

	getErrors() {
		let errs = [];
		for(let key in this.errors) {
			for(let index in this.errors[key]) {
				errs.push(this.errors[key][index]);
			}
		}
		return errs;
	}

	compile(watch) {
    this.compileCSS(watch)
    this.compileJS(watch)

		if (watch) {
			// Check for updates and display a nice message, but only if we're in watch mode (in case it takes a while)
			checkForUpdates()
		}
		// this.compileHTML(watch);
	}

	watch() {
		return this.compile(true);
	}

	compileCSS(watch) {

    const files = [ 'screen', 'print', 'admin' ]
      .map(file => `${file}.${this.css.ext}`)
      .filter(file => fs.existsSync(`${this.css.path}/${file}`));

		const compile = (file) => {

			const fullPath = `${this.css.path}/${file}`

      console.log(chalk.yellow(`>> Compiling ${this.css.type.toUpperCase()} [${file}]`));

			gulp.src(fullPath)
				.pipe(this.css.type === 'less' ? less() : sass().on('error', sass.logError))
				.pipe(autoprefixer())
				.on('error', (err) => {

					console.log(chalk.black(chalk.bgRed(`>> ${this.css.type.toUpperCase()} Compiler Error`)));
					console.log(err.message);

					this.addError(this.css.type, `Failed to compile ${file}`, err.message);

				})
				.pipe(gulp.dest(path.join(this.outputPath, '/css').replace(this.siteRoot, './')))
				.on('end', () => {
					console.log(chalk.cyan(">> Finished compiling "+file));
					this.changed('css');
				});

		};

		const compileAll = () => {
			this.clearErrors(this.css.type);
			for(let file of files) {
				compile(file);
			}
		};

		if(watch) {
			gulpWatch(this.css.path+'/**/*', () => {
				console.log(chalk.magenta(`------- Detected changes in ${this.css.type.toUpperCase()} -------`));
				compileAll();
			});
		}

		compileAll();

  }

	hash (data) {
		return crypto.createHash('md5').update(JSON.stringify(data)).digest("hex");
	}

	compileJS(watch) {

		// "watch" implies a dev environment, no watch means we want the production build
		const compiler = watch
			? this.compileDevJS()
			: this.compileProductionJS();

		compiler.plugin("after-emit", (compilation, callback) => {
			callback()
		})

		compiler.plugin("done", (stats) => {
			if (stats.hasErrors()) {
				console.log(chalk.red(">> Error Compiling JS:"));
				const info = stats.toJson()
				if (info.errors && info.errors.length) {
					console.error(info.errors[0])
				}
			} else {
				console.log(chalk.cyan(">> JS compilation completed in "+(stats.endTime - stats.startTime)+"ms"));
				this.changed('js');
			}
		})

		compiler.plugin("invalid", (fileName) => {
			fileName = fileName.replace(this.themePath, '')
			console.log(chalk.green(">> Detected changes: ") + chalk.magenta(fileName))
		})

		if (watch) {
			let watching
			const runWatch = () => {
				watching = compiler.watch({}, () => {})
			}
			compiler.plugin("done", () => {
				if (!watching) {
					runWatch()
				}
			})

			runWatch()

			// Also watch for new files to auto-include
			let hash = null
			setInterval(() => {
				fs.readdir(this.assetPath+'/js/widgets', (err, files) => {
					const newHash = this.hash(files)
					if (hash !== null && hash != newHash) {
						console.log(chalk.green(">> Detected change in file list, recompiling"))
						watching.invalidate()
					}
					hash = newHash
				})
			}, 500)
		} else {
			compiler.run(() => {})
		}

  }

  compileDevJS() {

		console.log(chalk.yellow(">> Compiling JS [development]"));

		const webpack = require('webpack')

		return webpack({
			entry: [
				require.resolve('./dev-refresh-client'),
				this.assetPath+'/js/index.js'
			],
			output: {
				path: path.join(this.outputPath, '/js'),
				filename: 'bundle.js',
				publicPath: path.join(this.outputPath, '/js/').replace(this.siteRoot, '')
			},
			devtool: 'source-map',
			module: {
				rules: [
					{
						test: /\.js$/,
						loader: require.resolve("babel-loader"),
						options: {
							ignore: /(node_modules|\.min\.js)/g,
              sourceMaps: true,
              cacheDirectory: true,
							presets: [
								[
									require.resolve('babel-preset-env'),
									{
										targets: {
											browsers: ["last 10 versions", "ie > 10"]
										}
									}
								]
							],
							plugins: [
                require.resolve('babel-plugin-syntax-dynamic-import'),
								require.resolve('babel-plugin-import-glob'),
                require.resolve('babel-plugin-transform-class-properties'),
                require.resolve('babel-plugin-transform-object-rest-spread'),
							]
						}
					}
				]
			},
			resolve: {
				alias: {
					libs: path.join(this.assetPath, '/js/libs/')
				}
			},
			plugins: [
				new webpack.DefinePlugin({
					'process.env.REFRESH_PORT': JSON.stringify(this.refreshPort || 0)
				})
			]
		});
		// }, (err, stats) => {
		// 	if (err) {
		// 		console.error(err.stack || err);
		// 		if (err.details) console.error(err.details);
		// 		return;
		// 	}
		// })
	}

	compileProductionJS() {

		console.log(chalk.yellow(">> Compiling JS [production]"));

		const webpack = require('webpack')

		return webpack({
			entry: [
				this.assetPath+'/js/index.js'
			],
			output: {
				path: path.join(this.outputPath, 'js'),
				filename: 'bundle.js',
				publicPath: path.join(this.outputPath, '/js/').replace(this.siteRoot, '')
			},
			module: {
				rules: [
					{
						test: /\.js$/,
						loader: require.resolve("babel-loader"),
						options: {
              ignore: /(node_modules|\.min\.js)/g,
							presets: [
								[require.resolve('babel-preset-env'),
									{
										targets: {
											browsers: ["last 10 versions", "ie > 10"]
										}
									}
								]
							],
							plugins: [
								require.resolve('babel-plugin-syntax-dynamic-import'),
								require.resolve('babel-plugin-import-glob'),
                require.resolve('babel-plugin-transform-class-properties'),
                require.resolve('babel-plugin-transform-object-rest-spread'),
							]
						}
					}
				]
			},
			plugins: [
				new UglifyJsPlugin()
				/*
				new webpack.DefinePlugin({
					'process.env.REFRESH_PORT': JSON.stringify(this.refreshPort || 0)
				})
				*/
			]
		}, (err, stats) => {
			if (err) {
				console.error(err.stack || err);
				if (err.details) console.error(err.details);
				return;
			}
		})
	}

	changed(jsOrCSS) {
    let change = 'css'
    if (jsOrCSS === 'js') {
      change = 'js'
    }

		clearTimeout(this._changeDebounce);
		this._changeDebounce = setTimeout(() => {
			this.emit('changed', change);
		}, 300);
	}

}

function fileExists (dir) {
  return fs.existsSync(dir)
}

function getStyleType(dir) {
  const less = ['less'].find(style => fileExists(`${dir}/${style}`))
  const sass = ['sass', 'scss'].find(style => fileExists(`${dir}/${style}`))

  if (sass && less) console.log(`Lol don't use less AND sass you weirdo! 😂`)

  if (sass) {
    const sassExt = ['sass', 'scss'].find(ext => fileExists(`${dir}/${sass}/screen.${ext}`))

    return {
      ext: sassExt,
      path: `${dir}/${sass}/`,
      type: sass
    }
  }

  if (less) {
    return {
      ext: less,
      path: `${dir}/${less}/`,
      type: less
    }
  }
}

module.exports = Compiler;
