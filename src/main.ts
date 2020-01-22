#!/usr/bin/env node
import path from 'path'
import minimist from 'minimist'
import fs from 'fs'

function listCommands() {
  const files = fs.readdirSync(path.resolve(__dirname, '../cmd/'))
  const commands = files.map(file =>
    require(require.resolve(path.resolve(__dirname, `../cmd/${file}/${file}`)))
  )
  return commands.reduce((acc, cmd) => {
    acc[cmd.name] = cmd
    return acc
  }, {})
}

function main() {
  const { _, ...opts } = minimist(process.argv.slice(2))
  const [cmdName, ...args] = _

  const commands = loadCommands()

  function findCommand(name) {
    if (commands[name]) {
      return commands[name]
    }

    return Object.values(commands).find(
      cmd => cmd.alias && cmd.alias.includes(name)
    )
  }

  const command = !cmdName
    ? Config.config.default && findCommand(Config.config.default)
    : findCommand(cmdName)

  const commandOpts = {}

  if (command.args) {
    /* command.args is an array of names to map args to an object */
    args.forEach((arg, i) => {
      if (command.args[i]) {
        commandOpts[command.args[i]] = arg
      }
    })

    commandOpts.restOfArgs = args.slice(command.args.length)
  } else {
    commandOpts.restOfArgs = args
  }

  const flags = {
    ...(command.flags || {}),
    ...{
      version: {
        alias: ['v'],
        type: true,
      },
    },
  }

  if (flags) {
    /* Converts flags and their alias into flagName */
    const flagEntries = Object.entries(flags)
    Object.entries(opts).forEach(([key, val]) => {
      flagEntries.forEach(([flagName, flagDef]) => {
        if (
          flagName === key ||
          (flagDef.alias && flagDef.alias.includes(key))
        ) {
          commandOpts[flagName] = val
        }
      })
    })
  }

  /* Function that runs the command */
  function run(cmd) {
    const cmdObj = typeof cmd === 'string' ? findCommand(cmd) : cmd
    return cmdObj.run(commandOpts, commands, findCommand)
  }

  if (!command) {
    if (commandOpts.version) {
      /* If ran with -v or -version then show version command */
      return run('version')
    }
    /* 
      If no command is found and there are no command matching flags,
      then show how to use 'help' and exit
      */
    const msg = cmdName
      ? `Command ${cmdName} not found. Type 'cli help' for help`
      : `Type 'cli help' for help`
    return console.log(msg)
  }
  return run(command)
}

main()

module.exports = main
module.exports.loadCommands = loadCommands
