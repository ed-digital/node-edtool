const path = require('path')
const fs = require('fs')
const read = require('../misc/read')

module.exports = (val) => {
  const appdata = process.env.APPDATA
    || (
      process.platform == 'darwin'
        ? process.env.HOME + 'Library/Preferences'
        : '/var/local'
    )

  if (process.platform !== 'win32') {
    console.warn('Only windows is supported at the moment')
    return
  }

  const flywheelPath = path.resolve(appdata + '/Local By Flywheel')

  if (!fs.existsSync(flywheelPath)) {
    console.warn(`Couldnt find your flywheel path in ${flywheelPath}`)
    return
  }


  const machineIP = read(`${flywheelPath}/machine-ip.json`);
  const sites = Object.values(require(`${flywheelPath}/sites.json`))

  const site = sites.find(
    site => Object.values(site).some(
      siteVal => siteVal === val
    )
  )

  site.path = site.path.replace('~', process.env.HOME)

  return {
    ...site,
    machineIP
  }
}

