const path = require('path');
const exec = require('./exec');

module.exports = function(rootDir) {
  let pharLoc = path.resolve(__dirname, '../wp-cli.phar');

  return {
    runCommand(cmdStr, callback) {
      let fullCommand = `php ${pharLoc} ${cmdStr}`;
      exec(fullCommand, rootDir, callback);
    },
    runCommandSync(cmdStr) {
      let fullCommand = `php ${pharLoc} ${cmdStr}`;
      let result = {};
      return exec.sync(fullCommand, rootDir, null);
    }
  };
  
};