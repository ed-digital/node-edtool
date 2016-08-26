const fs = require('fs-extra');
const fse = require('fs-extra');
const os = require('os');
const path = require('path');
const extend = require('extend');
const Wizard = require('./wizard');
const C = require('chalk');

module.exports = {
  getFilePath() {
    return path.join(os.homedir(), '/.edword/conf.json');
  },
  // Returns the path to the config json, even if it doesn't exist
  getProjectConfPath(name) {
    if(!name.match(/^[A-Z0-9\-\_]+$/i)) {
      throw new Error("Invalid project name. Alpha-numberic characters, dashes and underscores only.");
    }
    return path.join(os.homedir(), '/.edword/projects/'+name+'.json');
  },
  // Retrieve project configuration, or null if no project exists
  getProjectConf(name) {
    let confFile = this.getProjectConfPath(name);
    try {
      return fse.readJsonSync(confFile);
    } catch(err) {
      if(err.code === 'ENOENT') {
        // File doesn't exist. That's ok
        return null;
      } else {
        throw err;
      }
    }
  },
  getConfig() {
    let file = this.getFilePath();
    try {
      return fse.readJsonSync(file);
    } catch(err) {
      if(err.code === 'ENOENT') {
        // File doesn't exist. That's ok
        this.createDefaults();
        return this.getConfig();
      } else {
        throw err;
      }
    }
  },
  createDefaults() {
    let filePath = this.getFilePath();
    fse.ensureFileSync(filePath);
    let defaults = {
      acfKey: "",
      defaultAdminEmail: "admin@localhost",
      defaultAdmin: "admin",
      mysql: {
        host: "127.0.0.1",
        port: 3306,
        user: "",
        pass: ""
      }
    };
    this.writeConfig(defaults);
  },
  writeConfig(newData) {
    let filePath = this.getFilePath();
    let data = {};
    try {
      data = fse.readJsonSync(file);
    } catch(err) {
      // Ignore thx
    }
    extend(true, data, newData);
    fs.writeFileSync(filePath, JSON.stringify(data, true, '  '));
  },
  interactive() {
    
    const conf = this.getConfig();
    const wiz = new Wizard();
    
    // Welcome message
    console.log(C.cyan("\nHey!\nLet me ask you some questions about this environment, so I can easily create and manage your WP sites.\n"));
    
    // MySQL Config
    wiz.getBool("Would you like to configure a global MySQL user?\nYou should set up a MySQL user which can only be accessed from this machine, which can create new databases and new users.", true, (answer) => {
      if(answer === true) {
        if(!conf.mysql) conf.mysql = {};
        wiz.getText('Enter MySQL Host', conf.mysql.host || "127.0.0.1", (val) => {
          conf.mysql.host = val;
        });
        wiz.getNumber('Enter MySQL Port number', conf.mysql.port || 3306, (val) => {
          conf.mysql.port = val;
        });
        wiz.getText('Enter MySQL Username', conf.mysql.user || "root", (val) => {
          conf.mysql.user = val;
        });
        wiz.getText('Enter MySQL Password', conf.mysql.pass || "", (val) => {
          conf.mysql.pass = val;
          
          return new Promise((resolve, reject) => {
            const mysql = require('mysql');
            const connection = mysql.createConnection({
              host: conf.mysql.host,
              user: conf.mysql.user,
              pass: conf.mysql.pass
            });
            
            console.log(C.magenta("\nTesting connection..."));
            connection.connect((err) => {
              if(err) {
                console.log("An error occurred while connecting to MySQL: ", err.message);
                process.exit();
              } else {
                console.log(C.green("✔ Sweet! Connection checks out. That's MySQL Done."));
                resolve();
              }
            });
          });
          
        });
      }
    });
    
    // ACF Key
    wiz.getText("Enter your Advanced Custom Fields Pro key", conf.acfKey || "", (key) => {
      conf.acfKey = key;
      console.log(C.green("✔ Sweet!"));
    });
    
    // Admin guy/gal
    wiz.getText("Enter the default admin username for new sites", conf.defaultAdmin || "admin", (name) => {
      if(!name.match(/^[A-Z0-9\-\_\.\@]+$/i)) {
        return wiz.error("Invalid characters.");
      }
      conf.defaultAdmin = name;
      console.log(C.green("✔ Sweet!"));
    });
    
    wiz.getText("Enter the default admin email for new sites", conf.defaultAdminEmail || "root@localhost", (email) => {
      if(!email.match(/^[A-Z0-9\-\_\.\@]+$/i)) {
        return wiz.error("Invalid characters.");
      }
      conf.defaultAdminEmail = email;
      console.log(C.green("✔ Sweet!"));
    });
    
    wiz.begin(() => {
      
      this.writeConfig(conf);
      
      console.log(C.green("✔ Configuration successfully written to file. Enjoy your day!"));
      process.exit();
      
    });
    
  }
};