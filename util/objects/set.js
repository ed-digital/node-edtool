const is = require('../misc/is')

function set(obj, path, value, rewrite = false){
  const target = obj
  const points = path.split('.')
  const last = points.pop()

  for (const point of points) {
    if (is.undefined(target[point])) target[point] = {}
    if (!is.object(target[point] && rewrite)) {
      target[point] = {}
    } else {
      throw new Error(`Was going to rewrite the path ${point}. \nUse the 4th 'rewrite' parameter to force a rewrite`)
    }
    target = target[point]
  }

  target[last] = value
}
  
module.exports = set