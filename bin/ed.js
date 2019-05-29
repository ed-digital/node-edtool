#!/usr/bin/env node

const C = require('chalk')
const log = console.log

const starterTheme = require('../src/starter-theme')
const { checkForUpdates } = require('../src/check-for-updates')

const commands = {
  build: {
    description: 'Build all theme JS and CSS.',
    usage: ['', 'build'],
    alias: ['ykwtd', 'dev', 'start', 'you-know-what-to-do'],
    run: cmd => {
      if (cmd.opts.version) {
        showVersion()
        return
      }
      if (cmd.args.length !== 0) {
        log(C.red('Too many arguments'))
        showHelp('build')
      } else {
        // Start dev refresh server
        const RefreshServer = require('../src/dev-refresh-server')
        const refreshServer = new RefreshServer()

        // Start build
        const Compiler = require('../src/compiler')
        const compiler = new Compiler({
          ...cmd.opts,
          mode: 'development',
        })

        refreshServer.start()
        compiler.refreshPort = refreshServer.port
        compiler.compile()
        compiler.on('changed', type => {
          refreshServer.triggerRefresh(type)
        })
      }
    },
  },
  create: {
    description: 'Downloads the ED WP theme starter kit',
    usage: ['create', 'create <name> (Tries to name theme)'],
    run: opts => starterTheme(opts),
  },
  prod: {
    description: 'Build all theme JS and CSS for production.',
    usage: ['prod', 'prod -s || --silent (hide warnings)'],
    alias: ['production'],
    run: opts => {
      if (opts.args.length !== 0) {
        log(C.red('Too many arguments'))
        showHelp('build')
      } else {
        const Compiler = require('../src/compiler')
        const compiler = new Compiler({
          ...opts.opts,
          mode: 'production',
        })

        compiler.compile()
      }
    },
  },
  help: {
    description: 'Show help',
    alias: ['?'],
    usage: ['help', 'help <cmd> (for specific command)'],
    run: argv => showHelp(argv.args[0]),
  },
  version: {
    description: 'Shows edwp version',
    alias: ['v'],
    usage: ['version', 'v', '-v'],
    run: showVersion,
  },
  ngrok: {
    description: 'Creates an ngrok tunnel to your local site',
    alias: [],
    usage: ['ngrok site.local'],
    run: (...args) => require('../cmd-ngrok/cmd-ngrok')(...args),
  },
  // 'go': {
  //   description: 'Creates an ngrok tunnel to your local site',
  //   alias: [],
  //   usage: ['go site.local', 'go site'],
  //   run: (...args) => require('../cmd-go/cmd-go')(...args)
  // }
  proxy: {
    description: 'Creates an http proxy to your local site',
    alias: [],
    usage: ['proxy site.local', 'proxy site'],
    run: (...args) => require('../cmd-proxy/cmd-proxy')(...args),
  },
  'compress-images': {
    description: 'Compresses images in a path',
    alias: [],
    usage: ['compress-images <path>', 'compress-images (default cwd)'],
    run: (...args) =>
      require('../cmd-compress-images/cmd-compress-images')(...args),
  },
  tail: {
    description: 'Tail a log file to console',
    alias: [],
    usage: ['tail <path>'],
    run: (...args) => require('../cmd-tail/cmd-tail')(...args),
  },
  lorem: {
    description: 'Get some lorem ipsum',
    alias: ['l'],
    usage: ['lorem w10', 'lorem s3', 'lorem p2'],
    run: (...args) => require('../cmd-lorem/cmd-lorem')(...args),
  },
}

function showVersion() {
  checkForUpdates()
}

function showHelp(singleCmd) {
  log(`\nCOMPIL${C.bgBlack.white('ED.')}`)

  if (singleCmd) {
    log(C.grey(`Showing help for: ${singleCmd}`))
  }

  let leftWidth = Object.keys(commands).reduce(
    (last, current) => Math.max(last, current.length + 5),
    10
  )

  const showCmd = (name, cmd) => {
    const newLines = cmd.description.split(/\n/g)
    const [firstLine, ...lines] = newLines

    log('\n' + C.cyan(name) + ' '.repeat(leftWidth - name.length) + firstLine)

    lines.forEach(line => log(' '.repeat(leftWidth) + line))

    if (cmd.usage) {
      cmd.usage.forEach((tip, i) =>
        log(
          ' '.repeat(leftWidth) +
            (i !== 0 ? 'or  ' : 'eg. ') +
            C.yellow('ed ' + tip)
        )
      )
    }

    if (cmd.alias && cmd.alias.length > 1) {
      log(
        '\n' + ' '.repeat(leftWidth) + 'Alias:',
        cmd.alias.map(str => C.yellow(str)).join(', ')
      )
    }
  }

  if (singleCmd) {
    const cmd = getCmd(singleCmd)
    showCmd(singleCmd, cmd)
  } else {
    log('Below is a list of available commands:')

    Object.entries(commands)
      .filter(([name, cmd]) => !cmd.hidden)
      .forEach(([name, cmd]) => showCmd(name, cmd))
  }
}

const argv = require('minimist')(process.argv.slice(2))
const { _, ...opts } = argv
const [cmdName, ...args] = _

const cmdOpts = {
  name: cmdName,
  args: args,
  opts: transformOpts(opts),
}

// Attempting to run the given command
const cmd = getCmd(cmdName)

if (!cmd) {
  // Command unknown...
  log(C.bgRed(C.black(`Oooooops! I don't know the command '${cmdName}'...`)))
  // Showing help
  showHelp()
  process.exit()
}

// Call the function
try {
  cmd.run(cmdOpts)
} catch (err) {
  if (err.code === 400) {
    console.log(C.red(err.message))
    showHelp(cmd.name)
  } else {
    throw err
  }
}

function getCmd(givenName) {
  const name = givenName || 'build'

  if (commands[name]) {
    commands[name].name = name
    return commands[name]
  }

  return Object.values(commands).find(
    cmd => cmd.alias && cmd.alias.includes(name)
  )
}

function spreadInto(fn) {
  return arr => fn(...arr)
}

function transformOpts(opts) {
  return {
    ...opts,
    version: opts.v || opts.version,
    silent: opts.s || opts.silent,
    port: opts.p || opts.port,
    analyze: opts.a || opts.analyze,
  }
}
