const path = require('path');
const OS = require('./os');
// Flywheel is installed in different directories depending on OS
// On Windows, Flywheel is installed at "C:\Users\<user>\AppData\Roaming\Local by Flywheel" by default
const APP_SUPPORT_PATH = process.env.APPDATA || (OS == 'mac' ? path.join(process.env.HOME, 'Library/Application Support/') : '/var/local');


module.exports = APP_SUPPORT_PATH;