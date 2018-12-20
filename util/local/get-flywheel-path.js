const path = require('path')
const fs = require('fs')

module.exports = () => {
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
    process.exit()
    return
  }

  return flywheelPath
}