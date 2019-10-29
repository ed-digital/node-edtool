const path = require('path')
const fs = require('fs')

module.exports = () => {

  let appFolder

  if (process.env.APPDATA) {
    /* Windows */
    appFolder = process.env.APPDATA
  } else if (process.platform === 'darwin') {
    /* Mac */
    appFolder = process.env.HOME + '/Library/Application Support'
  } else {
    /* Linux I assume */
    appFolder = '/var/local'
  }

  const flywheelPath = path.resolve(appFolder + '/Local By Flywheel')

  if (!fs.existsSync(flywheelPath)) {
    console.warn(`Couldnt find your flywheel path in ${flywheelPath} please report to bryn@ed.com.au`)
    process.exit()
    return
  }

  return flywheelPath
}