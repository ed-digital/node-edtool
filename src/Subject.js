module.exports = class Subject {
  constructor(){
    this.__subject = {
      index: 0,
      listeners: {},
      cancels: {}
    }
  }
  __getKey(){
    return `k${this.__subject.index++}`
  }
  on(e, fn){
    const key = this.__getKey()

    let cancel = () => {
      delete this.__subject.listeners[e][key]
      delete this.__subject.cancels[key]
      cancel = () => {}
    }

    if (!this.__subject.listeners[e]) this.__subject.listeners[e] = {}
    this.__subject.listeners[e][key] = fn

    return cancel
  }
  emit(e, ...args){
    if (!this.__subject.listeners[e]) return
    const fns = Object.values(this.__subject.listeners[e])

    return fns.map(fn => fn(...args));
  }
}