const ejs = require('ejs')

// list of file/folder that should not be copied
const SKIP_FILES = ['node_modules', '.template.js']

function render(content, data) {
  return ejs.render(content, data)
}

function createDirectoryContents(templatePath, args) {
  // read all files/folders (1 level) from template folder
  const filesToCreate = fs.readdirSync(templatePath)
  // loop each file/folder
  filesToCreate.forEach(file => {
    const origFilePath = path.join(templatePath, file)

    // get stats about the current file
    const stats = fs.statSync(origFilePath)

    // skip files that should not be copied
    if (SKIP_FILES.includes(file)) return

    if (stats.isFile()) {
      // read file content and transform it using template engine
      let contents = fs.readFileSync(origFilePath, 'utf8')
      // write file to destination folder
      const writePath = path.join(CURR_DIR, projectName, render(file, args))
      fs.writeFileSync(writePath, render(contents, args), 'utf8')
    } else if (stats.isDirectory()) {
      // create folder in destination folder
      fs.mkdirSync(path.join(CURR_DIR, projectName, render(file, args)))
      // copy files/folder inside current folder recursively
      createDirectoryContents(
        path.join(templatePath, file),
        path.join(projectName, file)
      )
    }
  })
}
