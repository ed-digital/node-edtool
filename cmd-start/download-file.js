module.exports = function downloadFile(url, to) {
  const fetch = require('node-fetch')
  const fs = require('fs')

  return fetch(url).then(
    response => {
      return new Promise(resolve => {
        const dest = fs.createWriteStream(to)

        response.body.pipe(dest)
        response.body.on('error', err => {
          resolve({err})
        })
        dest.on('finish', () => {
          resolve({status: 'done'})
        })
        dest.on('error', err => {
          resolve({err})
        })
      })
    }
  )
}