import Subject from './subject'

export const allChanges = Symbol('all_changes')

export default class Stateful extends Subject {
  constructor (initialState = false) {
    super()

    this.state = clone(initialState || {})
    this.initialState = initialState
    this.isInitialChange = initialState
    this.hasChanged = []
  }

  setState (stateOrFn) {
    // You can pass a function that returns state or a plain object
    const prevState = clone(this.state)
    const newState = typeof stateOrFn === 'function' ? stateOrFn(this.state) : stateOrFn

    // Only get keys which have changed
    const changedKeys = Object.keys(newState)
      .filter(key => newState[key] !== prevState[key])

    // Merge this.state with the newState
    const currentState = clone(this.state, newState)
    this.state = currentState

    // Emit events for all the keys in changedKeys
    for (const key of changedKeys) {
      if (prevState[key] !== newState[key]) {
        this.emit(
          key, 
          {
            prevState, 
            newState, 
            currenState: this.state,
            state: this.state,
            self: this,
            changed: changedKeys,
            isFirstChange: !this.hasChanged.includes(key),
            isInitialChange: !this.isInitialChange
          }
        )
      }
    }

    // This emits changes for listeners that are listening without a key
    // eg this.changed(() => { ...something changed }) || this.changed('myKey', () => { ...mykey changed })
    this.emit(
      allChanges,
      {
        prevState: newState,
        currentState: this.state,
        state: this.state,
        currentChanges: changedKeys,
        changed: changedKeys,
        self: this,
        isInitialChange: !this.isInitialChange
      }
    )

    if (changedKeys.length && !this.isInitialChange) {
      this.isInitialChange = true
    }

    this.hasChanged = [
      ...this.hasChanged,
      ...changedKeys.filter(x => !this.hasChanged.includes(x))
    ]
  }

  changed (...args) {
    if (args.length === 2) {
      return this.on(...args)
    } else {
      return this.on(allChanges, args[0])
    }
  }

  // Alias for this.changed(() => {})
  listen (fn) {
    return this.on(allChanges, fn)
  }
}

function clone (...objs) {
  return objs.reduce(
    (result, obj) => {
      return {
        ...result,
        ...obj
      }
    },
    {}
  )
}
