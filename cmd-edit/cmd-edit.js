module.exports = () => {
  const { execSync } = require('child_process')
  const path = require('path')

  execSync(`code ${path.resolve(__dirname, '..')}`)
}
