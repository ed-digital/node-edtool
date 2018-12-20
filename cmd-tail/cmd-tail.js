const {Tail} = require('tail')
const path = require('path')
const chalk = require('chalk')
const readline = require('readline')



module.exports = function cmdTail (cmd) {
  // Make process.stdin emit key events
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  const logStart = () => {
    process.stdout.write('\033c')
    console.log(chalk.magenta(`Tailing: ${filePath.split(path.sep).pop()}`))
  }

  // Listen for the clear key
  process.stdin.on(
    'keypress', 
    (_, key) => {
      if (key.name !== 'c') return
      if (key.ctrl) process.exit()
      logStart()
    }
  );

  let filePath = cmd.args[0]

  if (!filePath) {
    const err = Error('You did not specify a path to tail')
    err.code = 400
    throw err
  }

  filePath = path.resolve(filePath)

  logStart()
  const tail = new Tail(path.resolve(filePath))
  tail.on('line', console.log)
  tail.on('error', err => console.log("ERROR", err))
}