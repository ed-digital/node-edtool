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
			this.assetPath = process.cwd();
		} else {
	    let pathMatch = process.cwd().match(/wp\-content\/themes\/([A-Z0-9\_\-\.]+)[\/]?$/i);
	    if(pathMatch) {
	      this.themeName = pathMatch[1];
	      this.siteRoot = process.cwd().replace(pathMatch[0], '');
	    } else {
	      this.siteRoot = wp.getSiteRoot(workingDir);
	      this.themeName = wp.getThemeName(this.siteRoot);
	    }
	    this.themePath = path.join(this.siteRoot, 'wp-content/themes', this.themeName);
	    this.assetPath = path.join(this.themePath, 'assets-src');
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
		if(!this.skipWordpress) {
			this.compileLESS(watch);
			this.compileSASS(watch);
		}
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

    let plugin = require('babel-plugin-import-glob');

		var bundler = watchify(browserify(this.skipWordpress ? this.siteRoot : this.assetPath+'/js/index.js', { debug: true })
      .transform(babelify.configure({
				sourceMaps: true,
  			presets: [require('babel-preset-env')],
        plugins: [require('babel-plugin-import-glob').default]
  		}))
    );
		
		if (watch) {
			let hash = null
			setInterval(() => {
				fs.readdir(this.assetPath+'/js/widgets', (err, files) => {
					const newHash = this.hash(files)
					if (hash !== null && hash != newHash) {
						rebundle()
					}
					hash = newHash
				})
			}, 500)
		}

		const rebundle = () => {
			console.log(chalk.yellow(">> Compiling JS"));
			this.clearErrors('js');

			bundler.bundle()
				.on('error', (err) => {

					console.log(chalk.black(chalk.bgRed(">> JS Compiler Error")));
					console.log(err.message + (err.codeFrame ? "\n"+err.codeFrame : ""));

					this.addError('js', `Failed to compile JS`, err.message + (err.codeFrame ? "\n"+err.codeFrame : ""));

				})
				.pipe(source('bundle.js'))
				.pipe(buffer())
				.pipe(sourcemaps.init({
					loadMaps: true
				}))
				// .pipe(uglify())
				.pipe(sourcemaps.write('./'))
				.pipe(gulp.dest(path.join(this.themePath, '/assets-built/js')));
		};

    bundler.on('time', (time) => {
      console.log(chalk.cyan(">> JS compilation completed in "+time+"ms"));
      this.changed();
			if(!watch) {
				bundler.close()
			}
    });

		if(watch) {
			bundler.on('update', () => {
				console.log(chalk.magenta("------- Detected changes in JS -------"));
				rebundle();
			});
		}

		rebundle();
	}

	changed() {
		clearTimeout(this._changeDebounce);
		this._changeDebounce = setTimeout(() => {
			this.emit('changed');
		}, 300);
	}

}

module.exports = Compiler;
