const child_process = require('child_process');
const splitArgs = require('string-argv');
const chalk = require('chalk');

module.exports = (cmd, rootDir, callback) => {
  console.log(chalk.magenta("> Running Command > " + (Array.isArray(cmd) ? cmd.join(' ') : cmd)));
  let parts = Array.isArray(cmd) ? cmd : splitArgs(cmd);
  let proc = child_process.spawn(parts[0], parts.slice(1), {
    cwd: rootDir
  });
  let stdoutBuffer = "";
  let stderrBuffer = "";
  proc.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    stdoutBuffer += chunk.toString();
  });
  proc.stderr.on('data', (chunk) => {
    process.stdout.write(chunk);
    stderrBuffer += chunk.toString();
  });
  proc.on('exit', (code) => {
    callback(code, stdoutBuffer, stderrBuffer);
  });
};

module.exports.sync = (cmd, rootDir) => {
  let parts = Array.isArray(cmd) ? cmd : splitArgs(cmd);
  let proc = child_process.spawnSync(parts[0], parts.slice(1), {
    cwd: rootDir,
    stdio: [null, null, process.stdout]
  });
  return {
    code: proc.status,
    stdout: proc.stdout.toString(),
    stderr: ""
  };
};