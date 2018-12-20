
module.exports = async function exec(cmd, ...args) {
  const { spawn } = require('child_process')

  console.log(cmd, args)

  const child = spawn(
    cmd,
    args,
    { stdio: [process.stdin, process.stdout, process.stderr] }
  )

  return await childExit(child)
}

function childExit(childProcess) {
  return new Promise(
    (resolve, reject) => {
      childProcess.once(
        'exit',
        (code, signal) => {
          if (code === 0) {
            resolve(undefined)
          } else {
            reject(new Error('Exit with error code: ' + code))
          }
        }
      )

      childProcess.once(
        'error',
        err => reject(err)
      )
    }
  )
}