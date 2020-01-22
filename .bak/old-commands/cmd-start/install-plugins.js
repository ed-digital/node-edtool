export default function installPlugins() {
  const dowloadFile = require('./download-file')
  const reactive = require('../../util/reactive/reactive')

  const downloadState = new Reactive({
    plugins: require('./plugin-list'),
  })

  plugins.map(plugin => ({ ...plugin, status: 'loading' }))

  const status = {
    done: '✔ Downloaded',
    loading: '🕐 Downloading',
    error: '❌ Error',
  }

  let message = plugins.reduce((str, plugin) => {
    return str + `${status[plugin.status]}`
  })

  plugins.map(plugin => {
    return downloadFile(plugin.url)
  })
}
