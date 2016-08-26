#!/usr/bin/env node

"use strict";

const C = require('chalk');
const edwp = require('../');
const async = require('async');
const path = require('path');

const commands = {
  "create": {
    description: "Create a new WordPress installation, with ED. defaults.",
    usage: ["create <folder>"],
    run: (argv) => {
      if(argv._.length === 0) {
        showHelp('create');
      } else if(argv._.length > 1) {
        console.log(C.red('Too many arguments'));
        showHelp('create');
      } else {
        let rootDir = path.resolve(process.cwd(), argv._[0]);
        edwp.createSite.interactive({
          rootDir: rootDir,
          projectName: path.basename(rootDir).replace(/(\..*$|[^A-Z0-9\-\_])/ig, '')
        });
      }
    }
  },
  "build": {
    description: "Build all theme JS and CSS.",
    usage: ["build", "build --watch (or build -w)"],
    run: (argv) => {
      if(argv._.length !== 0) {
        console.log(C.red('Too many arguments'));
        showHelp('build');
      } else {
        // Start build
        let compiler = new edwp.Compiler(process.cwd());
        compiler.compile(argv.watch || argv.w);
      }
    }
  },
  "config": {
    description: "Interactively set up global configuration for this machine user",
    usage: ["globals"],
    run: () => {
      edwp.globalConfig.interactive();
    }
  }
};

function showHelp(onlyCommand) {
  let leftWidth = 20;
  
  for(let name in commands) {
    if(!onlyCommand || name == onlyCommand) {
      console.log("\n" + C.cyan(name) + (" ").repeat(leftWidth-name.length) + commands[name].description);
      if(commands[name].usage) {
        for(let k in commands[name].usage) {
          let item = commands[name].usage[k];
          console.log((" ").repeat(leftWidth) + (k !== "0" ? "    " : "eg. ") + C.yellow("edword "+item));
        }
      }
    }
  }
  
}

const argv = require('minimist')(process.argv.slice(2));

if(argv._.length === 0) {
  
  // Showing help
  let title = "ED. WordPress Tool!";
  console.log(C.red("-".repeat(80) + "\n" + " ".repeat(80/2-title.length/2) + title + "\n" + "-".repeat(80)));
  console.log("Bellow is a list of available commands:");
  showHelp();
  process.exit();
  
} else {
  
  // Attempting to run the given command
  let commandName = argv._[0];
  argv._ = argv._.slice(1);
  
  if(!commands[commandName]) {
    // Command unknown...
    console.log(C.bgRed(C.black(`Oooooops! I don't know the command '${commandName}'...`)));
    process.exit();
  }
  
  // Call the function
  commands[commandName].run(argv);
}
