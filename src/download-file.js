const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

function downloadFile(path, outputPath, cb) {
  fetch(path, {
    compress: true
  })
    .then(response => {
      response.buffer().then(data => {
        fs.writeFile(outputPath, data, "buffer", err => {
          if (err) {
            cb(1, err);
            return;
          }

          cb(0);
        });
      });
    })
    .catch(err => {
      cb(1, err);
      console.log(err);
    });
}

module.exports = downloadFile;
