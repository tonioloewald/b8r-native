# b8r-native

This is a stub for creating native desktop apps with [bindinator](https://bindinator.com)
using [Electron](https://electronjs.org) or (eventually) [NWJS](https://nwjs.io).

Usage:

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

## Other Stuff

There's a `build` folder with `icon.png` in it that you'll want to replace to change your
icon.

`electron-menu.js` shows how to create native menus.

And, finally, customize `about.html` to give your application a custom "About Box".

## Two Examples

By default, the application created will be a simple file browser. This is a pretty
extensive example since it makes use of the Electron and Node APIs, includes
local libraries as well as stuff from the `b8r` package.

A simpler but prettier example is the **raw-viewer** which you can check out by
going into index.html and simply changing:

```
<b8r-component path="component/electron-file-browser"></b8r-component>
```

to:


```
<b8r-component path="component/raw-viewer"></b8r-component>
```

This example finds RAW image files using macOS's spotlight command line tools
and generates previews using the quicklook command line tools. It's not quite as
fast as purely native applications like FastRAWViewer, but it's surprisingly good.