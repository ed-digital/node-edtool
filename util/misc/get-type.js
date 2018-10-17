const is = require('./is')

function getType(val){
  const entries = Object.entries(is)

  for (const entry of entries) {
    const [type, check] = entry
    if (check(val)) {
      return type
    }
  }

  return undefined
}

module.exports = getType