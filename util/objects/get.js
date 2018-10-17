const is = require('../tests/is')

function get(obj, path){
  let target = obj
  const points = path.split('.')

  for (const point of points) {
    if (is.object(target)) {
      target = target[point]
    } else {
      return
    }
  }

  return target
}

module.exports = get