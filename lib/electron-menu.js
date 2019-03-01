/**
# electron-menu
*/
/* global require, module, __dirname, process */
'use strict'

const { app, Menu, BrowserWindow } = require('electron').remote
const path = require('path')

const appMenu = {
  label: app.getName(),
  submenu: [
    {
      label: `About ${app.getName()}`,
      click: () => {
        const win = new BrowserWindow({
          width: 512,
          height: 384,
          show: false,
          maximizable: false,
          minimizable: false,
        })
        win.loadURL(path.join('es6://', 'about.html'))
        win.once('ready-to-show', () => win.show())
        win.once('blur', () => win.close())
      }
    },
    { type: 'separator' },
    { role: 'services', submenu: [] },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideothers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' }
  ]
}

const editMenu = {
  label: 'Edit',
  submenu: [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { type: 'separator' },
    { role: 'delete' },
    { role: 'selectAll' }
  ]
}

const setApplicationMenu = template => {
  if (process.platform === 'darwin') {
    template.unshift(appMenu)
  }
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(null)
  Menu.setApplicationMenu(menu)
}

module.exports = { setApplicationMenu, editMenu }
