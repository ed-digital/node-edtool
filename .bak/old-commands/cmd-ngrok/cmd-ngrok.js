module.exports = (cmd) => {
  const path = require('path')
  const fs = require('fs')
  const exec = require('node-edtool/util/misc/exec')

  const identifier = cmd.args[0]

  let site

  if (identifier) {
    const getLocalByProp = require('node-edtool/util/local/get-local-by-props')
    site = getLocalByProp(identifier)
  } else {
    const getLocalByCurrent = require('node-edtool/util/local/get-local-current')
    site = getLocalByCurrent()
  }

  exec('ngrok', `http`, `${site.machineIP}:${site.ports.HTTP}`)
}