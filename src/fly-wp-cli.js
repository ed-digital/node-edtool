const cp = require('child_process');
const path = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const APP_SUPPORT_PATH = require('./vars/app-support-path');
const OS = require('./vars/os');

const sitePath = path.join(process.env.HOME, 'Local Sites', 'test', );

function wpcli(name, root){
    let env = {};
    const flywheelConfigFolder = path.join(APP_SUPPORT_PATH, 'Local by Flywheel');    

    const allSites = fse.readJSONSync(path.join(flywheelConfigFolder, 'sites.json'));
    const site = Object.values(allSites).find(site => site.name === name);
    const cwd = path.join(process.env.HOME, 'Local Sites', name, '/app/public');

    if(!site){
        console.log(chalk.red(`Cannot find a config for ${name}.\nAborting.`));
        throw new Error(`Cannot find a config for ${name}.\nAborting.`);
    }

    if(OS === 'windows'){

        // Set Windows (specific?) environment variables
        const configCmd = `"${path.join(process.env.HOME, "AppData\\Local\\Programs\\local-by-flywheel\\resources\\extraResources\\virtual-machine\\vendor\\docker\\windows\\docker-machine.exe")}" env local-by-flywheel`;
        let configOutput;
        try{
            configOutput = cp.execSync(configCmd, {
                env,
            }).toString()
        }catch(e){
            const str = e.toString();
            if(str.includes('not running')){
                console.log(chalk.red("\nCouldn't connect to flywheel."), "\nPlease make sure you have started your flywheel site then try again\n");
            }
            console.log("Got an error", e);
            process.exit();
        }
        
        let configLines = configOutput
        
        // Split on new lines or commas
        .split(/\n|,/)
        
        // Only return the elements that contain 'SET', 'set' or 'export' 
        .filter(cmd => cmd.search(/SET|set|export/) > -1)
        
        // Format env vars. Remove 'SET ', 'set ' and 'export '. Remove all ""
        .map(cmd => cmd.replace(/SET |set |export /g, '').replace(/"|'/g, ''))
        
        // Set variable on env object
        .forEach(pair => {
            const [prop, val] = pair.split('=');
            env[prop] = val;
        })

        console.log(`\nSet env variables\n`);
    }
    if(OS === 'mac'){
        const flywheelHost = fse.readFileSync(path.join(flywheelConfigFolder, 'machine-ip.json')).toString()

        env.FLYWHEEL_HOST = flywheelHost;
    }

    function formatCmd(cmd){
        if(OS === 'windows' || OS === "mac" || OS === "linux"){
            // -c syntax lets you run commands in the "cmd1 && cmd2" format
            return `"${path.join(process.env.HOME, "\\AppData\\Local\\Programs\\local-by-flywheel\\resources\\extraResources\\virtual-machine\\vendor\\docker\\windows\\docker.exe")}" exec -u man ${site.container} sh -c "${cmd}"`;
        }

        // Default
        return cmd;
    }

    function openShellCmd(){
        if(OS === 'windows' || OS === 'mac' || OS === 'linux'){
            return `"${path.join(process.env.HOME, "\\AppData\\Local\\Programs\\local-by-flywheel\\resources\\extraResources\\virtual-machine\\vendor\\docker\\windows\\docker.exe")}" exec -it ${site.container} /bin/bash`
        }
    }

    return {
        run:(cmd, ...args) => {
            let [opts, cb] = args;
            let command = formatCmd(cmd);
            if(!cb && typeof opts === 'function'){
                cb = opts;
            }

            
            if(typeof opts !== 'object' && args.length > 0){
                throw Error('opts must be an object');
            }else if(args.length === 0){
                opts = {};
            }

            const promise = new Promise((resolve, reject) => {
                let stdoutBuffer = "";
                let stderrBuffer = "";
                const child = cp.exec(command, {
                    env,
                    cwd,
                    ...opts,
                }, (error, stdout, stderr) => {
                    const result = {
                        code: (error && error.code) || 0,
                        stdout:stdout && stdout.toString(),
                        stderr:stderr && stderr.toString(),
                    }

                    if(cb) cb(result);
                    resolve(result);
                });                
            });

            return promise;
        },
        runSync:(cmd, cb) => {
            const command = formatCmd(cmd);
            const proc = cp.execSync(command, {
                env,
                cwd,
                stdio: [null, null, process.stdout],
            })
            return {
                code: proc.status,
                stdout: proc.stdout.toString(),
                stderr: ""
            }
        },
        openShell: (cb) => {
            const promise = new Promise((resolve, reject) => {
                let stderrBuffer = "";
                let stdoutBuffer = "";
                
                const child = cp.spawn(openShellCmd(), {
                    env,
                    detached:true,
                    shell:true,
                })
    
                child.stderr.on('data', function (err) {
                    // process.stdout.write(err);
                    console.log(err.toString())
                    stderrBuffer += err.toString();
                });
                    
                child.stdout.on('data', function (chunk) {
                    // process.stdout.write(chunk);
                    console.log(chunk.toString())
                    
                    stdoutBuffer += chunk.toString();
                }); 
            
                child.on('exit', function (exitCode) {
                    console.log("Child exited with code: " + exitCode);
    
    
                    const result = {
                        code:exitCode,
                        stdout:stdoutBuffer,
                        stderr:stderrBuffer,
                    }
    
                    if(typeof cb === 'function') {cb(result)};
                    resolve(result);
                });
            })

            return promise;
        },
    }
}


// (async function(){
//     const cli = wpcli('test');

//     await cli.openShell();
//     await cli.run('wp theme activate test');
    
    
//     console.log("This ran in psuedo sync")
// })()

module.exports = wpcli;