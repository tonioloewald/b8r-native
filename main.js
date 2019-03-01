const { app, BrowserWindow } = require('electron')

// custom protocol workaround for electron ESM support
const { protocol } = require( 'electron' )
const nfs = require( 'fs' )
const npjoin = require( 'path' ).join
const es6Path = __dirname

protocol.registerStandardSchemes( [ 'es6' ] )

const mimeTypes = {
  text: 'text/plain',
  md: 'text/markdown',
  htm: 'text/html',
  html: 'text/html',
  xml: 'text/xml',
  svg: 'image/svg+xml',
  css: 'text/css',
  jpg: 'image/jpeg',
  png: 'image/png',
  json: 'application/json',
  mjs: 'text/javascript',
  js: 'text/javascript'
}

const mimeType = (fileName) => {
  const ext = fileName.split('.').pop()
  return mimeTypes[ext] || 'application/octet-stream'
}

app.on( 'ready', () => {
  protocol.registerBufferProtocol( 'es6', ( req, cb ) => {
    let {url} = req
    url = url.split(/#|\?/)[0]
    if (url.substr(-1) === '/') {
      url = url.substr(0, url.length - 1)
    }
    console.log(url)
    nfs.readFile(
      npjoin( es6Path, url.replace( /es6:\/\//, '' ) ),
      (e, b) => { cb( { mimeType: mimeType(url), data: b } ) }
    )
  })
  createWindow()
})

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({ width: 800, height: 600 })

  // and load the index.html of the app.
  win.loadFile('index.html')
}
