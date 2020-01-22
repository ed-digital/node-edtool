module.exports = cmd => {
  const getLocalByProps = require('../../util/local/get-local-by-props')
  const exec = require('../../util/misc/exec')
  const path = require('path')

  const site = getLocalByProps(cmd.args[0])

  if (site) {
    process.chdir(site.path)
    console.log(process.cwd())
    exec(process.platform === 'win32' ? 'start' : 'open', '.').catch(err => {
      console.log(err)
    })
  }
}
