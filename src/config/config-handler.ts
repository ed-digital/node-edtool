import path from 'path'
import fs from 'fs'

function parse(str) {
  try {
    return JSON.parse(str)
  } catch (err) {
    return false
  }
}

export default class ConfigHandler<T> {
  objectCreator: () => T
  isSaving = false
  target: string

  constructor(target) {
    this.target = target
  }

  static from<C>(path, initialConfig: C) {
    return createConfigHandler<C>(path, initialConfig)
  }

  load() {
    try {
      return parse(fs.readFileSync(this.target, 'utf8'))
    } catch (e) {
      return false
    }
  }

  async nextSave() {
    if (this.isSaving) return
    this.isSaving = true
    await new Promise(resolve => setTimeout(resolve, 300))
    this.save(this.objectCreator())

    this.isSaving = false
  }

  async batchSave(creator) {
    this.objectCreator = creator
    this.nextSave()
  }

  save(obj) {
    return fs.writeFileSync(this.target, JSON.stringify(obj, null, 2), 'utf8')
  }
}

function createConfigHandler<T>(configDirectory: string, initialConfig: T) {
  const handler = new ConfigHandler<T>(configDirectory)

  let config: T | false = false

  function setInitialConfig() {
    /* Load ther config from file (sync) */
    config = handler.load()

    console.log(config)

    /* If there is still no config set it to the initial one */
    if (!config) {
      config = initialConfig
    }
  }

  function createProxy(object, context = [], needsFlushing = false) {
    const proxy = new Proxy(object, {
      get(target, key) {
        if (key === 'toString') return () => JSON.stringify(config, null, 2)

        if (!config) setInitialConfig()

        let pointer = config
        context.forEach(key => {
          pointer = pointer[key]
        })

        if (typeof pointer[key] === 'undefined') {
          return createProxy({}, [...context, key], true)
        }

        if (
          typeof pointer[key] === 'object' ||
          typeof pointer[key] === 'function'
        ) {
          return createProxy(pointer[key], [...context, key], needsFlushing)
        }

        /* Return the primitive value */
        return pointer[key]
      },
      set(target, key, value) {
        if (!config) setInitialConfig()

        let pointer = config

        context.forEach(key => {
          if (typeof pointer[key] !== 'object') {
            pointer[key] = {}
          }
          pointer = pointer[key]
        })

        handler.batchSave(() => config)
        pointer[key] = value

        return value
      },
    })

    return proxy
  }

  const proxy = createProxy({})

  return proxy as T
}
