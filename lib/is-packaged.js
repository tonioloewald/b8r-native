'use strict'

const electron = require('electron')
const isPackaged = (electron.app || electron.remote.app).isPackaged

module.exports = {
  isPackaged
}
