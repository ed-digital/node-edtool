const flycli = require('./fly-wp-cli');

function connectToDocker(name){
    return flycli(name).openShell()
}

module.exports = connectToDocker;