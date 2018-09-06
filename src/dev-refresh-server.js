const express = require('express')
const expressWS = require('express-ws')

module.exports = class DevRefreshServer {
  
  constructor () {
    this.sockets = []
  }
  
  start () {
    
    this.port = 12000 + Math.floor(Math.random() * 2000)
    this.app = express()
    expressWS(this.app)
    
    this.app.ws('/', (ws, req) => {
      ws.on('open', () => {
        console.log('Opened')
        
      })
      ws.on('close', () => {
        this.sockets = this.sockets.filter(o => o !== ws)
      })
      this.sockets.push(ws)
    })
    
    this.app.listen(this.port, '127.0.0.1')
    
  }
  
  triggerRefresh (type) {
    const payload = json_encode({ action: 'reload', type: type || 'js' })

    for (let ws of this.sockets) {
      ws.send(payload)
    }
  }
  
}

function json_encode(obj){
  try{
    return JSON.stringify(obj)
  } catch(e) {}
}