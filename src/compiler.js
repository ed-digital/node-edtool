const browserify = require('browserify');
const babelify = require('babelify');
const requireGlobify = require('require-globify');
// const less = require('less');
const chalk = require('chalk');

const wp = require('./wp');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto')

const EventEmitter = require('events').EventEmitter;

const sourcemaps = require('gulp-sourcemaps');
const watchify = require('watchify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const gulp = require('gulp');
const gulpWatch = require('gulp-watch');
const less = require('gulp-less');
const uglify = require("gulp-uglify");
// const sass = require('node-sass');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');

const checkForUpdates = require('./check-for-updates')

class Compiler extends EventEmitter {

	constructor(workingDir, skipWordpress) {
		super();

		this.skipWordpress = skipWordpress || false;

		if(skipWordpress) {
			this.siteRoot = process.cwd();
			this.themeName = "";
			this.themePath = process.cwd();
			this.assetPath = `${process.cwd()}/assets-src`;
		} else {
	    let pathMatch = process.cwd().match(/wp\-content\/themes\/([A-Z0-9\_\-\.]+)[\/]?$/i);
			try {
		    if(pathMatch) {
		      this.themeName = pathMatch[1];
		      this.siteRoot = process.cwd().replace(pathMatch[0], '');
		    } else {
		      this.siteRoot = wp.getSiteRoot(workingDir);
		      this.themeName = wp.getThemeName(this.siteRoot);
		    }
				this.themePath = path.join(this.siteRoot, 'wp-content/themes', this.themeName);
		    this.assetPath = path.join(this.themePath, 'assets-src');
			} catch (err) {
				this.themeName = 'unknown'
				this.themePath = workingDir
				this.assetPath = path.join(this.themePath, 'assets-src')
			}
		}

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
		this.compileLESS(watch);
		this.compileSASS(watch);
		this.compileJS(watch);
		
		if (watch) {
			// Check for updates and display a nice message, but only if we're in watch mode (in case it takes a while)
			checkForUpdates()
		}
		// this.compileHTML(watch);
	}

	watch() {
		return this.compile(true);
	}

	compileLESS(watch) {

		console.log(chalk.yellow(">> Compiling LESS"));

		let files = ['screen.less', 'print.less'];
		
		try {
			fs.accessSync(this.assetPath+'/less/admin.less')
			files.push('admin.less')
		} catch (err) { }

		let compile = (file) => {
			
			let fullPath = this.assetPath+'/less/'+file
			
			try {
				fs.accessSync(fullPath)
			} catch(err) {
				// File doesn't exist. So what
				return
			}

			gulp.src(fullPath)
				.pipe(less())
				.pipe(autoprefixer())
				.on('error', (err) => {

					console.log(chalk.black(chalk.bgRed(">> LESS Compiler Error")));
					console.log(err.message);

					this.addError('less', `Failed to compile ${file}`, err.message);

				})
				.pipe(gulp.dest('./assets-built/css'))
				.on('end', () => {
					console.log(chalk.cyan(">> Finished compiling "+file));
					this.changed();
				});

		};

		let compileAll = () => {
			this.clearErrors('less');
			for(let file of files) {
				compile(file);
			}
		};

		if(watch) {
			gulpWatch(this.assetPath+'/less/**/*', () => {
				console.log(chalk.magenta("------- Detected changes in LESS -------"));
				compileAll();
			});
		}

		compileAll();

	}

	compileSASS(watch) {
	
		console.log(chalk.yellow(">> Compiling SASS"));
	
		let files = ['screen.scss'];
	
		let compile = (file) => {
	
			let fullPath = this.assetPath+'/sass/'+file
	
			try {
				fs.accessSync(fullPath)
			} catch(err) {
				// File doesn't exist. So what
				return
			}
	
			gulp.src(fullPath)
				.pipe(sass().on('error', sass.logError))
				.pipe(autoprefixer())
				.on('error', (err) => {
	
					console.log(chalk.black(chalk.bgRed(">> SASS Compiler Error")));
					console.log(err.message);
	
					this.addError('sass', `Failed to compile ${file}`, err.message);
	
				})
				.pipe(gulp.dest('./assets-built/css'))
				.on('end', () => {
					console.log(chalk.cyan(">> Finished compiling "+file));
					this.changed();
				});
	
		};
	
		let compileAll = () => {
			this.clearErrors('sass');
			for(let file of files) {
				compile(file);
			}
		};
	
		if(watch) {
			gulpWatch(this.assetPath+'/sass/**/*', () => {
				console.log(chalk.magenta("------- Detected changes in SASS -------"));
				compileAll();
			});
		}
	
		compileAll();
	
	}
	
	hash (data) {
		return crypto.createHash('md5').update(JSON.stringify(data)).digest("hex");
	}
	
	compileJS(watch) {
		
		console.log(chalk.yellow(">> Compiling JS"));
		
		const webpack = require('webpack')
		
		const compiler = webpack({
			entry: [
				require.resolve('./dev-refresh-client'),
				this.assetPath+'/js/index.js'
			],
			output: {
				path: path.join(this.themePath, '/assets-built/js'),
				filename: 'bundle.js'
			},
			devtool: 'source-map',
			module: {
				rules: [
					{
						test: /\.js$/,
						exclude: /node_modules/,
						loader: require.resolve("babel-loader"),
						options: {
							sourceMaps: true,
			  			presets: [
								[require.resolve('babel-preset-env'),
									{
										targets: {
											browser: ["last 4 years", "ie > 10"]
										}
									}
								]
							],
			        plugins: [
								require.resolve('babel-plugin-import-glob'),
								require.resolve('babel-plugin-transform-class-properties')
							]
						}
					}
				]
			},
			plugins: [
				new webpack.DefinePlugin({
					'process.env.REFRESH_PORT': JSON.stringify(this.refreshPort || 0)
				})
			]
		}, (err, stats) => {
			if (err) {
		    console.error(err.stack || err);
		    if (err.details) {
		      console.error(err.details);
		    }
		    return;
		  }
		})
		
		compiler.plugin("after-emit", (compilation, callback) => {
			// console.log("Emitted", Object.keys(compilation), "Yeah")
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
				this.changed();
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
		//
    // let plugin = require('babel-plugin-import-glob');
		//
		// var bundler = watchify(browserify(this.skipWordpress ? this.siteRoot : this.assetPath+'/js/index.js', { debug: true })
    //   .transform(babelify.configure({
		// 		sourceMaps: true,
  	// 		presets: [require('babel-preset-env')],
    //     plugins: [require('babel-plugin-import-glob').default]
  	// 	}))
    // );
		
	}

	changed() {
		clearTimeout(this._changeDebounce);
		this._changeDebounce = setTimeout(() => {
			this.emit('changed');
		}, 300);
	}

}

module.exports = Compiler;
