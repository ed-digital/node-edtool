const path = require('path');
const exec = require('./exec');

module.exports = function wpcli(rootDir) {
  let pharLoc = path.resolve(__dirname, '../wp-cli.phar');
  let flywheelHost
  return {
    setFlywheelHost(host) {
      flywheelHost = host
    },
    runCommand(cmdStr, callback) {
      let fullCommand;
      if(Array.isArray(cmdStr)) {
        fullCommand = ['php', pharLoc].concat(cmdStr);
      } else {
        fullCommand = `php ${pharLoc} ${cmdStr}`;
      }
      exec(fullCommand, rootDir, callback, {
        FLYWHEEL_HOST: flywheelHost
      });
    },
    runCommandSync(cmdStr) {
      let fullCommand;
      if(Array.isArray(cmdStr)) {
        fullCommand = ['php', pharLoc].concat(cmdStr);
      } else {
        fullCommand = `php ${pharLoc} ${cmdStr}`;
      }
      let result = {};
      return exec.sync(fullCommand, rootDir, {
        FLYWHEEL_HOST: flywheelHost
      });
    }
  };
  
};