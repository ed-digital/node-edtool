function objectFromEntries(entries) {
  return entries.reduce((last, [k, value]) => {
    last[k] = value
    return last
  }, {})
}

module.exports = function getEntries({ isModule, name, root }) {
  const path = require('path')
  const fs = require('fs')

  function findFile(directories, fileNames, extensions) {
    for (const directory of directories) {
      for (const fileName of fileNames) {
        for (const extension of extensions) {
          const resultPath = path.resolve(
            root,
            `${directory}${path.sep}${fileName}.${extension}`
          )
          if (fs.existsSync(resultPath)) {
            console.log('exists sync', resultPath)
            return resultPath
          }
        }
      }
    }

    return false
  }

  const entries = objectFromEntries(
    [
      [
        isModule ? name : 'bundle',
        findFile(
          ['./src', './app', '.'],
          ['index', 'app', name],
          ['html', 'ts', 'js', 'tsx', 'jsx', 'mjs']
        ),
      ],
      [
        'admin',
        findFile(
          ['./src', './app', '.'],
          ['admin'],
          ['html', 'ts', 'js', 'tsx', 'jsx', 'mjs']
        ),
      ],
    ].filter(([entryName, entrySource]) => !!entrySource)
  )

  console.log({ entries })

  /* Will only add entries that exist */
  return entries
}
