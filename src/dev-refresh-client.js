(function(){
  try {
    if (localStorage.getItem('wasDevReloaded')) {
      console.log('%cPage was reloaded automatically because of a code change.', 'color: #9c55da')
      localStorage.removeItem('wasDevReloaded')
    }
    if (window.location.host.match(/(\.dev|\.local)$/) && window.WebSocket) {
      var ws = new WebSocket('ws://127.0.0.1:' + process.env.REFRESH_PORT)
      ws.addEventListener('message', function(msg){
        var payload = json_parse(msg.data) || { type: 'js', action: 'reload' }

        if (payload.type === 'reload') {
          if (payload.type === 'js') {
            console.log('%cDetected js code changes! Reloading page.', 'color: #9c55da')
            localStorage.setItem('wasDevReloaded', true)
            window.location.reload()
          }
  
          if (payload.type === 'css') {
            console.log('%cDetected css code changes! Reloading styles.', 'color: #9c55da')
            reloadCSS()
          }
        }
      })
      ws.onerror = function() {
        console.log('%cError connecting to dev reload server, you may need to refresh manually!', 'color: #da6955')
      }
    }

    function json_parse(str){
      try{
        return JSON.parse(str);
      } catch (err) {}
    }

    function reloadCSS(){
      addTag()
      tag.style = `transform: translateX(0);`
      clearTimeout(tm)
      tm = setTimeout(function(){
        tag.style = ``
      }, 3000)
      var els = toArray(document.querySelectorAll('link[rel="stylesheet"]'))
      els.forEach(function(el) {
        var href = el.getAttribute('href')
        var isFromDist = /assets-build|dist/.test(href)
        if(isFromDist){
          var url = href.split('?')[0]
          var query = parseQuery(href)
          query.ver = query.ver ? Number(query.ver) + 1 : 1
          el.setAttribute('href', url + createQuery(query))
        }
      })
    }

    function addTag(){
      if(tag) return 
      tag = document.createElement('div')
      tag.className = 'DEV_REFRESH-style-modal'
      tag.textContent = 'Styles were updated'
      document.body.append(tag)
    }

    function addTo(arr){
      return function(item) {
        return arr.push(item)
      }
    }
    function toArray(nodeList){
      var result = []
      nodeList.forEach(addTo(result))
      return result
    }
    function parseQuery(url){
      var result = {}
      var q = url.split('?')[1] || ''
      q.split('&').forEach(function(pair){
        var p = pair.split('=')
        result[p[0]] = p[1]
      })
      return result
    }
    function createQuery(obj){
      return '?' + Object.entries(obj).map(function(keyVal){
        return keyVal.join('=')
      }).join('&')
    }
  } catch(err) { }
}
)()