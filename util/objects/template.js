const is = require('../tests/is')
const get = require('./get')
const getType = require('../misc/get-type')
// const set = require('./set')

class Template {
  constructor(obj){
    this._template = traverseObject(obj)
  }
}

function createTemplate 

function template(objectTemplate, opts) {
  const self = {}
  const template = {}

  self.match = obj => {
    
  }

  

  return self
}

traverseObject = (subject, activePath) => {
  const template = {}


  Object.entries(([key, value]) => {
    const currentPath = [...activePath, key]
    if (is.object(val)) {
      traverseObject(value, currentPath)
    } else {
      const type = getType(value)
      if (type) {
        template[currentPath.join('.')] = type
      }
    }
  })

  return template
}