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
        imageminJpegtran({ quality: '80' }),
        imageminPngquant({ quality: '80' })
      ]
    }
  )

  files.forEach(file => {
    console.log('Compressed', chalk.yellow(file.path.replace(outputPath + path.sep, '')))
  })

  // compressImages(
  //   ,
  //   path.resolve(targetPath + '/built/'),
  //   {
  //     compress_force: false,
  //     statistic: true,
  //     autoupdate: false,
  //   },
  //   false,
  //   { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
  //   { png: { engine: 'pngquant', command: ['--quality=20-50'] } },
  //   { svg: { engine: 'svgo', command: '--multipass' } },
  //   { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } },
  //   (err, done, stats) => {
  //     console.log(stats)
  //     console.log(err)
  //     if (done) {
  //       console.log("Done")
  //     }

  //     if (err) {
  //       console.log(err)
  //     }
  //   }
  // )
}