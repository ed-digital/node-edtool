const os = require('os');

const opSys = {
    'win32':'windows',
    'darwin': 'mac',
    'linux':'linux'
}

const platform = os.platform();


module.exports = opSys[platform];