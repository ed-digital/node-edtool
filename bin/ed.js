#!/usr/bin/env node

"use strict";

const C = require('chalk');
const edwp = require('../');
const async = require('async');
const path = require('path');
const fs = require('fs');
const os = require('os');
const printf = require('printf');

const commands = {
  "create": {
    description: "Create a new WordPress installation, with ED. defaults, \nin interactive mode.",
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
        const Compiler = require('../src/compiler');
        let compiler = new Compiler(process.cwd(), argv.force || argv.f);
        compiler.compile(argv.watch || argv.w);
      }
    }
  },
  "go": {
    description: "Jump to a project, or to the current projects theme\nfolder.",
    usage: ["go", "go <projectName>"],
    run: (argv) => {
      console.log("If you are seeing this, you are missing some code in your .profile file.\nType: "+C.yellow("ed shell-setup")+" to install the relevant function. Be sure to restart your terminal session afterwards.");
    }
  },
  "shell-setup": {
    hidden: true,
    run: (argv) => {
      let files = ['.zshrc', '.bash_profile', '.profile'];
      let shellFunc = fs.readFileSync(path.resolve(__dirname, "../shell_function")).toString();
      for(let fileName of files) {
        let shellFile = path.join(os.homedir(), fileName);
        // Grab contents of shell file, ripping out old stuff
        try {
          let contents = fs.readFileSync(shellFile).toString().replace(/#BEGIN_EDWP\n(.|[\s\S])+#END_EDWP/, '');
          contents += `\n#BEGIN_EDWP\n${shellFunc}\n#END_EDWP`;
          fs.writeFileSync(shellFile, contents);
          console.log(C.magenta("✔ Updated your ~/"+fileName+" with some cool stuff."));
          return;
        } catch(err) {
          
        }
      }
      // Fallback to .profile if none of the files were found
      try {
        let fileName = '.bash_profile';
        let shellFile = path.join(os.homedir(), fileName);
        fs.writeFileSync(shellFile, shellFunc);
        console.log(C.magenta("✔ Updated your ~/"+fileName+" with some cool stuff."));
      } catch(err) {
        console.log(C.red("ERROR! Unable to find/update any shell profile files (eg. "+files.join(', ')+") while attempting to add cool stuff. Try running `ed shell-setup` later on."));
      }
    }
  },
  "ls": {
    description: "Lists known projects",
    usage: ["ls-projects"],
    run(argv) {
      let projects = edwp.globalConfig.getProjects();
      console.log(C.green(`\nBelow is a list of sites scanned on your machine:`));
      console.log(C.white(`- Use ${C.yellow('ed scan')} within a WP directory to add more.`));
      console.log(C.white(`- Type ${C.yellow('ed go <project>')} to jump to one of the following projects:`));
      for(let project of projects) {
        console.log(C.magenta(printf("%-18s", project.projectName)) + printf("%-30s", project.siteURL) + printf("%-40s", project.rootDir.replace(os.homedir(), '~')));
      }
      console.log("");
    }
  },
  "settings": {
    description: "Interactively set up global configuration for this user",
    usage: ["settings"],
    run() {
      edwp.globalConfig.interactive();
    }
  },
  "scan": {
    description: "Recursively scans upwards, looking for a \nWordPress installation.",
    usage: ["scan"],
    run() {
      const wp = require('../src/wp');
      const Wizard = require('../src/wizard');
      let conf = {};
      try {
        conf.rootDir = wp.getSiteRoot(process.cwd());
      } catch(err) {
        console.log(err.message);
        process.exit(1);
      }

      // Try to grab the project name from the website root directory
      let projectName = "";
      let configAlreadyExists = false;
      try {
        projectName = fs.readFileSync(path.join(conf.rootDir, '.ed-project-name')).toString();
        if(projectName) {
          // If we have a project name, then import the existing config
          let otherConf = edwp.globalConf.getProjectConf(projectName);
          configAlreadyExists = true;
          for(let key in otherConf) {
            conf[key] = otherConf[key];
          }
        }
      } catch(err) { }

      conf.siteURL = wp.getOption(process.cwd(), "home");
      conf.title = wp.getOption(process.cwd(), "blogname");
      conf.themeName = wp.getThemeName(process.cwd());
      conf.projectName = projectName;

      console.log(C.cyan("Site URL: ") + conf.siteURL);
      console.log(C.cyan("Root Directory: ") + conf.rootDir);
      console.log(C.cyan("Active Theme: ") + conf.themeName);

      if(!conf.projectName) {

        let wiz = new Wizard();
        wiz.getText("Enter a unique project name", conf.projectName, (value) => {
          if(!value) return false;
          if(!value.match(/^[A-Z0-9\-\_]+$/i)) {
            return wiz.error("Invalid name. Alpha-numberic, dashes and underscores only, please!");
          }
          conf.projectName = value;
        });

        wiz.begin(() => {
          // Save project name to the project itself
          console.log("Saving project preferences...");
          fs.writeFileSync(path.join(conf.rootDir, '.ed-project-name'), conf.projectName);
          edwp.globalConfig.setProjectConf(conf.projectName, conf);
          console.log(C.green("Done!"));
        });

      } else {

        edwp.globalConfig.setProjectConf(conf.projectName, conf);

      }

    }
  },
  "get-target-path": {
    hidden: true,
    run(argv) {
      C.enabled = true;
      const wp = require('../src/wp');

      // No project name provided, so try find theme path of current project, if there is one
      if(argv._.length === 0) {

        let rootDir, themeName;
        try {
          rootDir = wp.getSiteRoot(process.cwd());
          themeName = wp.getThemeName(rootDir);
        } catch(err) {
          process.stderr.write(C.red(err.message));
          process.exit(1);
        }

        process.stdout.write(path.join(rootDir, 'wp-content/themes', themeName));
        process.exit();

      // Project name provided
      } else if(argv._.length == 1) {

        C.enabled = true;
        if(argv._.length === 0) {
          process.stderr.write("Missing project argument. Usage: "+C.yellow("ed p <projectName>"));
          process.exit(1);
        }
        let projectName = argv._[0];
        let conf = edwp.globalConfig.getProjectConf(projectName);

        if(conf === null) {
          process.stderr.write(`No project named ${C.cyan(projectName)} defined in ${C.cyan("'~/.ed/projects/'")}.\nYou can fix this by changing into the project directory, and typing ${C.yellow("ed scan")}\n`);
          process.exit(1);
        } else {
          if(conf.themePath) {
            process.stdout.write(conf.themePath);
          } else {
            let themeName = wp.getThemeName(conf.rootDir);
            process.stdout.write(path.join(conf.rootDir, 'wp-content/themes', themeName));
          }
        }
      }
    }
  },
  "get-project-path": {
    hidden: true,
    run(argv) {
      C.enabled = true;
      if(argv._.length === 0) {
        process.stderr.write("Missing project argument. Usage: "+C.yellow("ed p <projectName>"));
        process.exit(1);
      }
      let projectName = argv._[0];
      let conf = edwp.globalConfig.getProjectConf(projectName);
      if(conf === null) {
        process.stderr.write(`No project named ${C.cyan(projectName)} defined in ${C.cyan("'~/.ed/projects/'")}.\nYou can fix this by changing into the project directory, and typing ${C.yellow("ed scan")}`);
        process.exit(1);
      } else {
        process.stdout.write(conf.rootDir);
      }
    }
  },
  "get-theme-path": {
    hidden: true,
    run() {
      C.enabled = true;

      const wp = require('../src/wp');

      let rootDir, themeName;
      try {
        rootDir = wp.getSiteRoot(process.cwd());
        themeName = wp.getThemeName(rootDir);
      } catch(err) {
        process.stderr.write(C.red(err.message));
        process.exit(1);
      }

      process.stdout.write(path.join(rootDir, 'wp-content/themes', themeName));
      process.exit();
    }
  }
};

function showHelp(onlyCommand) {
  let leftWidth = 20;

  for(let name in commands) {
    if(!onlyCommand || name == onlyCommand) {
      if(commands[name].hidden) continue;
      let descriptionParts = commands[name].description.split(/\n/g);
      console.log("\n" + C.cyan(name) + (" ").repeat(leftWidth-name.length) + descriptionParts[0]);
      for(let k in descriptionParts) {
        if(k*1 === 0) continue;
        console.log((" ").repeat(leftWidth) + descriptionParts[k]);
      }
      if(commands[name].usage) {
        for(let k in commands[name].usage) {
          let item = commands[name].usage[k];
          console.log((" ").repeat(leftWidth) + (k !== "0" ? "    " : "eg. ") + C.yellow("ed "+item));
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
  console.log("Below is a list of available commands:");
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
