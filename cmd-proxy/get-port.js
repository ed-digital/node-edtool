module.exports = function getPort(port = 3000) {
  const net = require('net')
  return new Promise(resolve => {
    const server = net.createServer()
    server.listen(port, function(err) {
      server.once('close', function() {
        resolve(port)
      })
      server.close()
    })
    server.on('error', () => {
      resolve(getPort(port + 1))
    })
  })
}
