const wpcli = require('./wpcli');

const fs = require('fs');
const path = require('path');

module.exports.getSiteRoot = function(dir) {
  
  let parts = dir.split(path.sep);
  
  for(let k = 0; k < parts.length; k++) {
    let subpath = parts.slice(0, parts.length - k).join(path.sep);
    try {
      // From docs: This throws if any accessibility checks fail, and does nothing otherwise
      fs.accessSync(path.join(subpath, 'wp-config.php'));
      return subpath;
    } catch(err) {
      continue;
    }
  }
  
  throw new Error("Unable to determine WordPress site root. Are you in a WordPress site?");
  
};

module.exports.getThemeName = function(root) {
  let result = wpcli(root).runCommandSync('option get template');
  if(result.code) {
    console.log("Unable to determine current theme");
    process.exit();
  }
  return result.stdout.trim();
};

module.exports.getOption = function(root, name) {
  let result = wpcli(root).runCommandSync('option get '+name);
  if(result.code) {
    console.log("Unable to determine current theme");
    process.exit();
  }
  return result.stdout.trim();
};
