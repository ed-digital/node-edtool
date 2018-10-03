const fs = require("fs");
const path = require("path");
// const fetch = require("node-fetch");

function downloadFile(path, outputPath) {
  return fetch(path, { compress: true })
    .then(response => {
      response.buffer().then(data => new Promise(resolve => {
        fs.writeFile(outputPath, data, "buffer", err => {
          if (err) throw new Error(err)
          resolve()
        });
      }));
    })
}

module.exports = downloadFile;
