const includesAll = requre('../array/includes-all')

const is = {
  object(obj){
    return typeof obj === 'object' && obj !== null
  },
  array(arr){
    return Array.isArray(arr)
  },
  string(str){
    return typeof str === 'string'
  },
  boolean(bool){
    return typeof bool === 'boolean'
  },
  truthy(val){
    return Boolean(val)
  },
  falsey(val){
    return !Boolean(val)
  },
  function(fn){
    return typeof fn === 'function'
  },
  promise(obj){
    const tempProm = new Promise(resolve => {})

    // May be a third party promise that fully implements a native promise
    return includesAll(
      prototypeOf(obj),
      prototypeOf(tempProm)
    )
  },
  undefined(val){
    return typeof val === 'undefined'
  }
}

module.exports = is