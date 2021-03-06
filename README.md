# b8r-native

![b8r-native in action](images/b8r-native.png)

This is a stub for creating native desktop apps with [bindinator](https://bindinator.com)
using [Electron](https://electronjs.org) or (eventually) [NWJS](https://nwjs.io).

## Usage

Copy or clone this repo, and then:

```
npm install
```

To run the project in electron for debugging:

```
npm run start
```

Note that the file-browser example creates its own menu. You can still toggle dev tools
using ctrl-shift-I (look inside the `index.html` file to see how that is implemented).

To build:

```
npm run dist
```

## main.js

This is the entry point for electron. Most notably it sets up a custom protocol because
`b8r` uses ESM (i.e. import vs. require) and Electron does not (currently) allow you
to load javascript modules via the `file:` protocol.

Aside from that, all main.js really does is open a `BrowserWindow` with `index.html` in it.

## index.html

The key thing this file does is import global CSS files, import `b8r.js`, and insert a 
single `<b8r-component>` tag to load the app's base component.

Two example components are provided, each is a simple
self-contained application. Also see comments inside the file.

## Other Stuff

There's a `build` folder with `icon.png` in it that you'll want to replace to change your
icon.

`electron-menu.js` shows how to create native menus.

And, finally, customize `about.html` to give your application a custom "About Box".

## File Browser Example

By default, the application created will be a simple file browser. This is a pretty
extensive example since it makes use of the Electron and Node APIs, includes
local libraries as well as stuff from the `b8r` package.

## RAW Viewer Example

A simpler but perhaps more exciting example is the **raw-viewer** which you can 
check out by going into index.html and simply changing:

```
<b8r-component path="component/electron-file-browser"></b8r-component>
```

to:


```
<b8r-component path="component/raw-viewer"></b8r-component>
```

This (Mac-only) example makes extensive use of shell commands to find RAW image files 
using macOS's spotlight command line tool `mdfind`, extracts metadata using `mdls`, 
and generates thumbnails and full size views using the quicklook command line tool
`qlmanage`. 

It's not quite as fast as purely native applications like 
[FastRAWViewer](https://www.fastrawviewer.com/) or [RAWPower](https://gentlemencoders.com/)
(both of which I use and recommend), but it's surprisingly good.