const imagemin = require('imagemin')
const imageminJpegtran = require('imagemin-jpegtran')
const imageminPngquant = require('imagemin-pngquant')

const chalk = require('chalk')

const path = require('path')
const fs = require('fs')

module.exports = async cmd => {
  if (!cmd.args[0]) {
    console.warn('You did not supply a path, compressing images in current working directory')
  }
  const targetPath = path.resolve(cmd.args[0] ? cmd.args[0] : process.cwd())
  const outputPath = path.resolve(targetPath + '/built/')

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath)
  }

  const files = await imagemin(
    [`${targetPath}/*.{jpg,JPG,jpeg,JPEG,png,svg,gif}`],
    outputPath,
    {
      plugins: [
        imageminJpegtran({ quality: '60' }),
        imageminPngquant({ quality: '60' })
      ]
    }
  )

  files.forEach(file => {
    console.log('Compressed', chalk.yellow(file.path.replace(outputPath + path.sep, '')))
  })
}