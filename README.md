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