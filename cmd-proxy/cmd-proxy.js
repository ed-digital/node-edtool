
module.exports = async cmd => {
  const getLocalByCurrent = require('../util/local/get-local-current')
  const getLocalByProp = require('../util/local/get-local-by-props')
  const getPort = require('./get-port')
  const os = require('os')
  const clipboard = require('clipboardy')
  const chalk = require('chalk')
  const express = require('express')
  const proxy = require('express-http-proxy')
  const fs = require('fs')
  const getFlywheelPath = require('../util/local/get-flywheel-path')
  const path = require('path')
  const identifier = cmd.args[0]

  port = await getPort(cmd.opts.port ? Number(cmd.opts.port) : 80)

  console.log(os.networkInterfaces())

  const localNetworkIp = os
    .networkInterfaces()
    ['WiFi'].find(network => network.family === 'IPv4').address

  const site = identifier ? getLocalByProp(identifier) : getLocalByCurrent()

  console.log(site)

  const siteInfo = {
    network: `${site.machineIP}:${site.ports.HTTPS}`,
    domain: site.domain,
    target: `${localNetworkIp}:${port}`,
  }

  if (site) {
    const app = express()

    const proxyOpts = {
      proxyReqOptDecorator: function(proxyReqOpts, originalReq) {
        proxyReqOpts.rejectUnauthorized = false
        return proxyReqOpts
      },
      async userResDecorator(proxyRes, proxyResData, userReq, userRes) {
        const mime = proxyRes.headers['content-type'] || ''

        // Replace instances of the remote origin with the current request origin
        if (mime.match(/(text|javascript)/)) {
          const response = proxyResData
            .toString('utf8')
            .replace(new RegExp(siteInfo.domain, 'g'), siteInfo.target)
            .replace(
              new RegExp(`http://${siteInfo.target}`, 'g'),
              `https://${siteInfo.target}`
            )
          // await clipboard.write(response)
          return response
        } else {
          return proxyResData
        }
      },
    }

    const flywheelPath = getFlywheelPath()

    app.use('/', (req, res, next) => {
      proxy(siteInfo.domain, {
        ...proxyOpts,
        https: true,
        secure: true,
        ssl: {
          key: fs.readFileSync(
            path.resolve(`${flywheelPath}/routes/certs/${site.domain}.key`),
            'utf8'
          ),
          cert: fs.readFileSync(
            path.resolve(`${flywheelPath}/routes/certs/${site.domain}.crt`),
            'utf8'
          ),
        },
      })(req, res, next)
    })

    app
      .listen(port, () => {
        clipboard.write(`${localNetworkIp}:${port}`)
        console.log(
          `
${chalk.magenta(`Proxying ${site.domain}`)}

${
  false
    ? `Details
  Machine ip:    ${chalk.yellow(site.machineIP)}
  Ports:
    HTTP:        ${chalk.yellow(site.ports.HTTP)}
    HTTPS:       ${chalk.yellow(site.ports.HTTPS)}
    MYSQL:       ${chalk.yellow(site.ports.MYSQL)}
    MAIL:        ${chalk.yellow(site.ports.MAILCATCHER)}

`
    : ``
}On this machine
  - ${chalk.yellow(`localhost:${port}`)}

On local network:
  - ${chalk.yellow(`${localNetworkIp}:${port}`)} ${chalk.yellow`(Copied)`}
`
        )
      })
      .on('error', err => {
        if (err.code === 'EACCES') {
          console.error(
            "Encountered an EACCES error, which means you probably don't have permission to start a server on port 80!\nYou made need to use sudo :)"
          )
          process.exit()
        }
        throw err
      })
  }
}
