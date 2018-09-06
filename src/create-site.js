"use strict";

const Wizard = require('./wizard');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const async = require('async');
const os = require('os');
const C = require('chalk');
const getWPSession = require('./wpcli');
const mysql = require('mysql');
const FlyCli = require('./fly-wp-cli');
const APP_SUPPORT_PATH = require('./vars/app-support-path');
const downloadFile = require('./download-file');

const generatePassword = require('generate-password').generate;

const globalConf = require('./global-config');
const getPluginList = require('./plugin-list');
const exec = require('./exec');

function createSite(options, callback) {
  
  let config = globalConf.getConfig();
  
  // Create root directory, if it doesn't already exist
  fse.ensureDirSync(options.rootDir);
  
  let wp = getWPSession(options.rootDir);
  let flycli = FlyCli(options.flywheelName);
  
  if (!options.isFlywheel) {
    options.dbHost = config.mysql.host
    options.dbPort = config.mysql.port
    options.dbUser = config.mysql.user
    options.dbPass = config.mysql.pass
    options.wpAdmin = config.defaultAdmin || 'admin';
    options.wpPass = generatePassword({
      length: 14,
      numbers: true,
      symbols: false,
      excludeSimilarCharacters: true
    });
    options.wpEmail = config.defaultAdminEmail || "root@localhost";
    // options.mysqlHost =
  } else {
    const flywheelConfigFolder = path.join(APP_SUPPORT_PATH, 'Local by Flywheel')
    const data = fse.readJsonSync(path.join(flywheelConfigFolder, 'sites.json'));
    
    // Sets options.flywheelData to the site object
    options.flywheelData = Object.values(data).find(site => site.name === options.flywheelName)

    if (!options.flywheelData) {
      throw new Error('Could not locate site in '+flywheelConfigFolder+'/sites.json')
    }
    
    const flywheelHost = fs.readFileSync(path.join(flywheelConfigFolder, 'machine-ip.json')).toString()
    console.log('Host', flywheelHost)
    wp.setFlywheelHost(flywheelHost)
  }
  
  options.themePath = path.join(options.rootDir, 'wp-content/themes', options.themeName);
  
  const escape = (val) => {
    return String(val).replace(/(["\s'$`\\])/g, '\\$1');
  };
  
  const plugins = require('./plugin-list');
  
  async.series([
    (next) => {
      if (options.isFlywheel) return next()
      // Start by downloading WP files
      console.log(C.cyan("Downloading WordPress..."));
      wp.runCommand('core download', function(code, out, err) {
        if(code === 0) {
          console.log(C.green("✔ Download Complete"));
          next();
        }
      });
    },
    (next) => {
      if (options.isFlywheel) return next()
      // Ensure DB exists
      const db = mysql.createConnection({
        host: config.mysql.host,
        user: config.mysql.user,
        pass: config.mysql.pass
      });
      
      options.dbName = options.dbName || options.projectName+"_"+Date.now();
      
      console.log(C.cyan("Connecting to MySQL server..."));
      db.connect((err) => {
        if(err) throw err;
        
        console.log(C.cyan(`Creating DB '${options.dbName}'...`));
        db.query(`CREATE DATABASE ${options.dbName}`, (err) => {
          db.end();
          if(err) throw err;
          next();
        });
      });
    },
    (next) => {
      if (options.isFlywheel) return next()
      console.log(C.cyan("Configuring WP..."));
      wp.runCommand(`core config --dbname=${options.dbName} --dbuser=${escape(config.mysql.user)} --dbpass=${escape(config.mysql.pass)} --dbhost=${escape(config.mysql.host)} --skip-check`, function(code, out, err) {
        if(code === 0) {
          console.log(C.green("✔ WP Configuration Complete"));
          next();
        } else {
          console.log(C.red(":( Configuration Failed"));
        }
      });
    },
    (next) => {
      // Now install
      if (options.isFlywheel) return next()
      console.log(C.cyan("Installing..."));
      wp.runCommand(['core', 'install', `--url=${options.siteURL}`, `--title=${options.title}`, `--admin_user=${escape(options.wpAdmin)}`, `--admin_password=${escape(options.wpPass)}`,`--admin_email=${escape(options.wpEmail)}`], function(code, out, err) {
        if(code === 0) {
          console.log(C.green("✔ Installation Complete"));
          next();
        } else {
          console.log(C.red(":( Installation Failed"));
        }
      });
    },
    (next) => {
      // If this is a flywheel site, modify the wp-config.php file to include the docker hostname
      if (!options.isFlywheel) return next()
      const configPath = path.join(options.rootDir, 'wp-config.php')
      const contents = fs.readFileSync(configPath).toString()
        .replace(/define\( 'DB_HOST', (['"])/, "define( 'DB_HOST', (defined( 'WP_CLI' ) && WP_CLI ) ? getenv('FLYWHEEL_HOST').':'.'" + options.flywheelData.ports.MYSQL + "' : $1")
      fs.writeFileSync(configPath, contents)
      console.log('Outpt', contents)
      next()
    },
    (next) => {
      // Set up theme
      console.log(C.cyan(`Initializing blank theme to ${options.themePath}...`));
      async.series([
        // Create theme folder
        next => fse.ensureDir(options.themePath, next),
        // Download latest theme
        next => downloadFile(`http://ed-wp-plugin.ed.com.au/release/ed-blank-theme-latest.zip`, path.join(options.themePath, 'ed-blank-theme-latest.zip'), (code, err) => {
          if(code === 0) {
            next();
          } else {
            console.log(C.red(":( Failed to download blank ED. theme."));
          }
        }),
        // Unzip it
        // Added force overwrite flag. Windows wasn't accepting any input
        next => exec(`unzip -o ed-blank-theme-latest.zip`, options.themePath, (code) => {
          if(code === 0) {
            next();
          } else {
            console.log(C.red(":( Failed to extract ZIP"));
          }
        }),
        // Replace theme name within style.css
        next => {
          let themeMetaPath = path.join(options.themePath, 'style.css');
          let themeMetaContents = fs.readFileSync(themeMetaPath).toString().replace('Your Theme Name', options.title);
          fs.writeFileSync(themeMetaPath, themeMetaContents);
          next();
        },
        // Replace theme name within package.json
        next => {
          let themeMetaPath = path.join(options.themePath, 'package.json');
          let themeMetaContents = fs.readFileSync(themeMetaPath).toString().replace('an-ed-website', options.themeName+"-theme");
          fs.writeFileSync(themeMetaPath, themeMetaContents);
          next();
        },
        // Activate the theme
        (next) => { 
          if(!options.isFlywheel){
            wp.runCommand(`theme activate ${options.themeName} --skip-packages --skip-themes --skip-plugins`, (code) => {
              if(code === 0) {
                next();
              } else {
                console.log(C.red(":( Failed to activate theme"));
                console.log(C.red("Skipping"));            
                next();
              }
            })
          }else{
            flycli.run(`wp theme activate ${options.themeName} --skip-packages --skip-themes --skip-plugins`)
            .then(result => {
              if(result.code === 0){
                console.log(`Theme ${C.yellow(options.themeName)} activated`);
                next();
              }else{
                console.log(JSON.stringify(result, null, 2));
                console.log(C.red(":( Failed to activate theme"));
                console.log(C.red("Skipping"));            
                next();
              }
            })
          }
          
        },
        // Delete zip file
        next => fs.unlink(path.join(options.themePath, 'ed-blank-theme-latest.zip'), next),
        // NPM Install
        next => {
          exec.sync(`npm install`, options.themePath, (code) => {
            console.log("This ran ");
            if(code === 0) {
              next();
            } else {
              console.log(C.red(":( Failed to run `npm install`. You may need to do this manually, later."));
              next();
            }
          })
          next();
        },
      ], next);
    },
    (next) => {
      if(options.isFlywheel) return next();
      // Install plugins by URL
      async.eachSeries(getPluginList(config, options), (item, innerNext) => {
        console.log(C.cyan("Installing Plugin: "+(item.title || item.name)));
        wp.runCommand(`plugin install ${item.name} activate --skip-packages --skip-themes --skip-plugins`, (code) => {
          if(code === 0) {
            console.log(C.green(`✔ Installed '${item.title}' Successfully`));
            innerNext();
          } else {
            console.log(C.red(":( Failed to install plugin"));
          }
        });
      }, next);
    },
    (next) => {
      if(!options.isFlywheel) return next();
      async.eachSeries(getPluginList(config, options), (item, innerNext) => {

        console.log(C.magenta(`Installing ${item.title}`))
        flycli.run(`wp plugin install ${item.name} --activate --skip-packages --skip-themes --skip-plugins`)
        .then(result => {
          if(result.code === 0){
            console.log(C.green(`✔ Installed '${item.title}' Successfully`));    
            innerNext()      
          }else{
            console.log(C.red(`😢 Failed to install ${item.title}`));
            innerNext()        
          }
        })
        
      }, next)
    },
    (next) => {
      // Notify the user of admin password
      globalConf.setProjectConf(options.projectName, options);
      if (options.isFlywheel) {
        console.log(C.green(`\n✔✔✔✔ Complete!`));
      } else {
        console.log(C.green(`\n✔✔✔✔ Completed WP Setup! Below are your login details. Be sure to save them in a safe place.\n\nProject Name: ${options.projectName}\nSite Title: ${options.title}\nURL: ${options.siteURL}\nUsername: ${options.wpAdmin}\nPassword: ${options.wpPass}`));
      }
      console.log(C.green(`✔ Now type: ed go ${options.projectName}`));
      console.log(C.green(`            npm install`));
      console.log(C.green(`            ed build --watch`));
      process.exit();
    }
  ]);
  
}

// Interactive mode prompts the user for information, before calling the main createSite function
createSite.interactive = function(_) {
  
  let config = globalConf.getConfig();
  
  let options = {
    title: null,
    siteURL: null,
    themeName: null,
    rootDir: null,
    projectName: false,
    isFlywheel: false
  };
  if(_) Object.assign(options, _);
  let wizard = new Wizard();
  
  let dirContents;
  
  if (options.isFlywheel) {
    wizard.getBool(`Setup a new theme and install the ED. plugin for the Flywheel site at:\n${options.rootDir}?`, false, (create) => {
      if(create === false) {
        process.exit();
      }
    });
  } else {
    try {
      dirContents = fs.readdirSync(options.rootDir);
    } catch(e) {
      // Warn if the folder doesn't exist
      wizard.getBool(`Directory '${options.rootDir}' does not exist.\nCreate folder?`, false, (create) => {
        if(create === false) {
          process.exit();
        }
      });
    }
  }

  // Warn if more than 2 files, so we're not overwriting anything important!
  if(options.isFlywheel == false && dirContents && dirContents.length > 2) {
    wizard.getBool(`Directory '${options.rootDir}' is not empty.\nFolder contains ${dirContents.length} files.\nContinue anyway?`, false, (answer) => {
      if(answer === false) {
        process.exit();
      }
    });
  }
  
  wizard.getText("Choose a theme name", () => options.projectName, (value) => {
    if(!value) return false;
    if(!value.match(/^[A-Z0-9\-\_]+$/i)) {
      return wizard.error("Invalid theme name. Alpha-numberic, dashes and underscores only, please!");
    }
    options.themeName = value;
  });
  
  wizard.getText("A project slug will be used to uniquely identify this project on your computer.\nEnter a unique project slug", () => options.projectName, (value) => {
    if(!value) return false;
    if(!value.match(/^[A-Z0-9\-\_]+$/i)) {
      return wizard.error("Invalid theme name. Alpha-numberic, dashes and underscores only, please!");
    }
    if(globalConf.getProjectConf(value)) {
      return wizard.error("That name is already in use.");
    }
    options.projectName = value;
  });
  
  if (options.isFlywheel == false) {
    wizard.getText("Enter the Website Title", () => options.projectName, (value) => {
      if(!value) return false;
      options.title = value;
    });
  }else{
    options.title = options.themeName;
  }
  
  if (options.isFlywheel == false) {
    wizard.getText("Enter the domain or URL you'll be using. (eg. coolsite.dev)", () => options.projectName+".dev", (value) => {
      if(!value) return false;
      if(!value.match(/^[A-Z0-9\-\_\.]+$/i)) {
        return wizard.error("Invalid characters.");
      }
      options.siteURL = value;
    });
  }
  
  wizard.begin(() => {
    console.log('Creating with options', options)
    createSite(options);
  });
  
};

module.exports = createSite;