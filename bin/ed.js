#!/usr/bin/env node

const C = require('chalk');
const log = console.log

const starterTheme = require('../src/starter-theme')
const checkForUpdates = require('../src/check-for-updates')

const commands = {
  "build": {
    description: "Build all theme JS and CSS.",
    usage: ['', 'build'],
    alias: ['ykwtd', 'dev', 'start', 'you-know-what-to-do'],
    run: cmd => {
      if (cmd.opts.version) {
        showVersion()
        return 
      }
      if(cmd.args.length !== 0) {
        log(C.red('Too many arguments'));
        showHelp('build');
      } else {      
        // Start dev refresh server
        const RefreshServer = require('../src/dev-refresh-server');
        const refreshServer = new RefreshServer()
        
        // Start build
        const Compiler = require('../src/compiler');
        const compiler = new Compiler(cmd.opts);
        
        refreshServer.start()
        compiler.refreshPort = refreshServer.port
        compiler.compile(true);
        compiler.on('changed', (type) => {
          refreshServer.triggerRefresh(type)
        })
      }
    }
  },
  "create": {
    description: 'Downloads the ED WP theme starter kit',
    usage: ['create', 'create <name> (Tries to name theme)'],
    run: opts => starterTheme(opts)
  },
  "prod": {
    description: "Build all theme JS and CSS for production.",
    usage: ["prod", "prod -s || --silent (hide warnings)"],
    alias: ['production'],
    run: opts => {
      if(opts.args.length !== 0) {
        log(C.red('Too many arguments'));
        showHelp('build');
      } else {
        
        const Compiler = require('../src/compiler');
        const compiler = new Compiler(opts.opts);
        
        compiler.compile(false)
      }
    }
  },
  "help": {
    description: "Show help",
    alias: ['?'],
    usage: [ 'help', 'help <cmd> (for specific command)' ],
    run: argv => showHelp(argv.args[0])
  },
  "version": {
    description: 'Shows edwp version',
    alias: ['v'],
    usage: ['version', 'v', '-v'],
    run: showVersion
  }
};

function showVersion(){
  checkForUpdates()
}

function showHelp(singleCmd) {
  log(`\n${C.bgRed.black('COMPIL')}${C.bgBlack.white('ED.')}\n`);
  
  let leftWidth = 10;

  const showCmd = (name, cmd) => {
    const newLines = cmd.description.split(/\n/g);
    const [firstLine, ...lines] = newLines

    log("\n" + C.cyan(name) + (" ").repeat(leftWidth-name.length) + firstLine);

    lines.forEach(line => log((" ").repeat(leftWidth) + line))

    if(cmd.usage) {
      cmd.usage.forEach(
        (tip, i) => log(
          (" ").repeat(leftWidth) + (i !== 0 ? "or  " : "eg. ") + C.yellow("ed "+tip)
        )
      )
    }

    if (cmd.alias && cmd.alias.length > 1) {
      log("\n"+(" ").repeat(leftWidth)+'Alias:', cmd.alias.map(str => C.yellow(str)).join(', '))
    }
  }

  if (singleCmd) {
    const cmd = getCmd(singleCmd)
    showCmd(singleCmd, cmd)
  } else {
    log("Below is a list of available commands:");

    Object.entries(commands)
    .filter(([name, cmd]) => !cmd.hidden)
    .forEach(spreadInto(showCmd))
  }

}

const argv = require('minimist')(process.argv.slice(2));
const {_, ...opts} = argv
const [cmdName, ...args] = _;

const cmdOpts = {
  name: cmdName,
  args: args,
  opts: transformOpts(opts)
}



// Attempting to run the given command
const cmd = getCmd(cmdName)

if(!cmd) {
  // Command unknown...
  log(C.bgRed(C.black(`Oooooops! I don't know the command '${cmdName}'...`)));
  // Showing help
  showHelp();
  process.exit();
}

// Call the function
cmd.run(cmdOpts);


function getCmd(givenName){
  const name = givenName || 'build'

  if (commands[name]) {
    return commands[name]
  }

  return Object.values(commands).find(
    cmd => cmd.alias && cmd.alias.includes(name)
  )
}

function spreadInto(fn){
  return arr => fn(...arr)
}

function transformOpts(opts){
  return {
    ...opts,
    version: opts.v || opts.version,
    silent: opts.s || opts.silent
  }
}