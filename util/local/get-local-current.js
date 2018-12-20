const getFlywheelPath = require('./get-flywheel-path')

module.exports = cmd => {
  const path = require('path')
  const fs = require('fs')
  const read = require('../misc/read')

  const current = process.cwd()

  const points = current.split(path.sep)
  const index = points.indexOf('Local Sites')

  const newPath = points.slice(index, index + 2).join(path.sep)


  const flywheelPath = getFlywheelPath()


  const machineIP = read(`${flywheelPath}/machine-ip.json`);
  const sites = Object.values(require(`${flywheelPath}/sites.json`))

  const site = sites.find(
    site => site.path.includes(newPath)
  )

  site.path = site.path.replace('~', process.env.HOME)

  return {
    ...site,
    machineIP
  }
}