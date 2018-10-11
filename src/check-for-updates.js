const fs = require('fs')
const npmAPI = require('api-npm')
const compareVersions = require('compare-versions')
const chalk = require('chalk')
const pkg = require('../package.json')

const log = str => console.log(chalk.magenta(str))

module.exports = async function () {

  const isGit = fs.existsSync(`${__dirname}/../.git`)

  console.log('Installed through GIT')
  console.log(`Current version ${chalk.yellow(pkg.version)}`)

  const currentVersion = pkg.version

  console.log('\nChecking for updates')
  const data = await npmGetDetails('edwp')

  try {
    const latestVersion = data['dist-tags'].latest
    if (latestVersion && currentVersion && compareVersions(latestVersion, currentVersion) > 0) {
      log("A new version of this tool is out!\n- Version "+chalk.yellow(latestVersion)+" is available.")

      if (isGit) {
        log("- Pull latest changes to upgrade!")
      } else {
        log("- Type " + chalk.yellow('npm install -g edwp') + " to upgrade!")
      }
    } else {
      if (isGit) {
        log('Your ed tool is up to date (Though you should check git)')
      } else {
        log('Your ed tool is up is up to date')
      }
    }
  } catch (err) {
    log(chalk.red('Error checking for latest version...' + err.message))
  }
}

function npmGetDetails (name) {
  return new Promise(
    resolve => npmAPI.getdetails('edwp', data => resolve(data))
    )
}