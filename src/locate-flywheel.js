const path = require('path')
const fse = require('fs-extra')
const chalk = require('chalk')

module.exports = function(name) {
  const basePath = path.join(process.env.HOME, 'Local Sites', name);
  const sitePath = path.join(basePath, 'app/public')
  const configPath = path.join(sitePath, 'wp-config.php')
  if (!fse.pathExistsSync(basePath)) {
    throw new Error('Could not find a site at ' + chalk.magenta(basePath.replace(process.env.HOME, '~')))
  }
  if (!fse.pathExistsSync(configPath)) {
    throw new Error('Found a folder at ' + chalk.magenta(basePath.replace(process.env.HOME, '~')) + ', however could not locate a WordPress config file at ' + chalk.magenta(configPath.replace(process.env.HOME, '~')))
  }
  return sitePath
}