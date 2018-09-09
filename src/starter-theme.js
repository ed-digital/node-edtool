const downloadFile = require('./download-file')
const exec = require('./exec')
const path = require('path')

function starterTheme(opts){
  const cwd = process.cwd()
  exec.sync('git clone git@bitbucket.org:ed_digital/ed-wp-plugin.git ./ed', path.resolve(cwd, '../../plugins'))
}

module.exports = starterTheme