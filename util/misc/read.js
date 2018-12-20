module.exports = function read(path) {
  const fs = require('fs')
  if (fs.existsSync(path)) {
    try {
      return fs.readFileSync(path, 'utf8');
    } catch (err) {
    }
  }

  return false
}