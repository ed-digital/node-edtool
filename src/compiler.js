const browserify = require('browserify');
const babelify = require('babelify');
const requireGlobify = require('require-globify');
const chalk = require('chalk');

const wp = require('./wp');

const fs = require('fs');
const path = require('path');

const EventEmitter = require('events').EventEmitter;

const sourcemaps = require('gulp-sourcemaps');
const watchify = require('watchify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const gulp = require('gulp');

// module.exports = function(workingDir, options) {
//   
//   let siteRoot = wp.getSiteRoot(workingDir);
//   let themeName = wp.getThemeName(siteRoot);
//   let themePath = path.join(siteRoot, 'wp-content/themes', themeName);
//   
//   var b = browserify(path.join(themePath, 'assets-src/js/index.js'))
//     .transform(requireGlobify)
//     .transform(babelify.configure({
//       presets: ["es2015"]
//     }))
//     .bundle()
//     .pipe(fs.createWriteStream(path.join(themePath, 'assets/js/bundle.js')));4
//   
// };

class Compiler extends EventEmitter {
	
	constructor(workingDir) {
		super();
    
    this.siteRoot = wp.getSiteRoot(workingDir);
    this.themeName = wp.getThemeName(this.siteRoot);
    this.themePath = path.join(this.siteRoot, 'wp-content/themes', this.themeName);
    this.assetPath = path.join(this.themePath, 'assets-src');
		
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
		// this.compileLESS(watch);
		this.compileJS(watch);
		// this.compileHTML(watch);
	}
	
	watch() {
		return this.compile(true);
	}
	
	compileLESS(watch) {
		
		console.log(chalk.yellow(">> Compiling LESS"));
		
		let files = ['screen.less', 'print.less'];
		
		let compile = (file) => {
			
			gulp.src(this.assetPath+'/less/'+file)
				.pipe(less())
				.pipe(autoprefixer())
				.on('error', (err) => {
					
					console.log(chalk.black(chalk.bgRed(">> LESS Compiler Error")));
					console.log(err.message);
					
					this.addError('less', `Failed to compile ${file}`, err.message);
					
				})
				.pipe(gulp.dest('./build/css'))
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
	
	compileJS(watch) {
		var bundler = watchify(browserify(this.assetPath+'/js/index.js', { debug: false }).transform(babelify.configure({
			presets: ['es2015']
		})));

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
				.pipe(sourcemaps.write('./'))
				.pipe(gulp.dest('./build/js'));
		};

		if(watch) {
			bundler.on('update', () => {
				console.log(chalk.magenta("------- Detected changes in JS -------"));
				rebundle();
			});
			bundler.on('time', (time) => {
				console.log(chalk.cyan(">> JS compilation completed in "+time+"ms"));
				this.changed();
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