try {
  if (localStorage.getItem('wasDevReloaded')) {
    console.log('%cPage was reloaded automatically because of a code change.', 'color: #9c55da')
    localStorage.removeItem('wasDevReloaded')
  }
  if (window.location.host.match(/(\.dev|\.local)$/) && window.WebSocket) {
    var ws = new WebSocket('ws://127.0.0.1:' + process.env.REFRESH_PORT)
    ws.addEventListener('message', function(msg){
      if (msg.data === 'reload') {
        console.log('%cDetected code changes! Reloading page.', 'color: #9c55da')
        localStorage.setItem('wasDevReloaded', true)
        window.location.reload()
      }
    })
    ws.onerror = function() {
      console.log('%cError connecting to dev reload server, you may need to refresh manually!', 'color: #da6955')
    }
  }
} catch(err) { }
