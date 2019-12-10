/**
# RAW Viewer

Sorry, this demo is macOS and electron only.

1. It finds all local `NEF`, `CR2`, and `DNG` files using spotlight `mdfind`
2. It extracts metadata using `mdls` (sadly not EXIF data directly yet so, in particular,
   Orientation data is not wholly accurate and some portrait photos will be upside-down)
3. It generates thumbnails using `qlmanage -t -o /tmp/...` (it would be even faster if we
   could bypass the file system entirely, but that would entail writing a native plugin)
4. It shows you the previews using `biggrid`
5. It gets Finder tags using `xattr` and displays
   `star`, `favorite`, and `flag` comments (but doesn't show color tags yet nor allow you to
   create/edit custom tags)
6. It gets Finder comments using `xattr` (but you can't edit the comments yet)
7. It uses [jsfeat](https://inspirit.github.io/jsfeat/) to try to detect blurred or otherwise
  bad photos by
  1. converting the image to grayscale using `jsfeat.imgproc.grayscale`
  2. using `jsfeat.imgproc.equalize_histogram` to compensate for photos with close tones or
     poor exposure
  3. `jsfeat.yape` to try to find detail in the image

  Photos suspected of being poor are marked with the "yape score".
8. It supports filtering files by filename, date-range, and tag.

The previews are generated asynchronously up to three at a time. (I picked three
because chances are you have at least four virtual cores, but it looks like sips
parallelizes anyway — a little experimentation seems to indicate that doing more than
one file at a time has some benefit.)

Previews are generated in random order, but priority is given to previews for
grid cells that are currently in view.

## To Do

* Save data cache and reload it on launch
* Integrate with user's choice of image editor
* Record user views and actions as tags
* Quick move actions (iCloud, Dropbox, etc. -- user-specified folders, with/without auto subfolders)
* Filter on path (vs. file name)
* UI Refinements (toolbar, explicit toggle for metadata)
* Option to show all metadata
* Show color tags
* Restrict to a directory / volume etc. (especially for importing from cards)
* It would be nice to get actual EXIF data so all images could be rendered with correct orientation
* xmp support
* Some kind of quick-and-dirty scheme to detect over- and under- exposed images
* Some kind of quick-and-dirty scheme to detect out-of-focus images
* Automatic generation of "virtual tags" for lens, focal length (wide, normal, telephoto, ultrawide,
  long), aperture (wide open, normal, small), shutter speed, camera, year, year+month, location
  (if data available)
* Edit Finder comments directly (and possibly allow file renaming)
*/
export default {
  css:`
  .raw-viewer-component {
    display: flex;
    position: relative;
  }

  .example.raw-viewer-component {
    height: 480px;
  }

  .raw-viewer-scroller {
    flex: 1 1 auto;
    line-height: 0;
    overflow-y: scroll;
    overflow-y: overlay;
    text-align: center;
    background: #444;
    padding: 56px 8px 8px;
  }

  .raw-viewer-scroller.one-column {
    flex: 0 0 160px;
  }

  .raw-viewer-tile {
    margin: 0;
    padding: 0;
    display: inline-block;
    width: 128px;
    height: 128px;
    overflow: hidden;
    position: relative;
    background: #ddd;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    margin: 8px;
  }

  .raw-viewer-tile > span {
    position: absolute;
    display: block;
    color: white;
    background: rgba(0,0,0,0.5);
    left: 0;
    right: 0;
    bottom: 0;
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 20px;
    opacity: 0.5;
    transition: 0.1s ease-out;
  }

  .raw-viewer-tile:hover > span,
  .raw-viewer-tile:focus > span {
    opacity: 1;
  }

  .raw-viewer-tile:focus {
    box-shadow: none;
    outline: none;
  }

  .raw-viewer-component img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .raw-viewer-detail {
    flex: 1 1 auto;
    position: relative;
    background: #333;
  }

  .raw-viewer-detail .icon-cross2 {
    position: absolute;
    color: white;
    font-size: 24px;
    line-height: 32px;
    width: 32px;
    height: 32px;
    text-align: center;
    top: 10px;
    right: 10px;
    cursor: default;
    background: rgba(0,0,0,0.5);
    border-radius: 2px;
    opacity: 0.5;
    transition: 0.1s ease-out;
  }

  .raw-viewer-detail .metadata {
    position: absolute;
    bottom: 10px;
    right: 10px;
    color: white;
    background: rgba(0,0,0,0.75);
    padding: 5px;
    border-radius: 5px;
    opacity: 0.5;
    transition: 0.1s ease-out;
  }

  .raw-viewer-detail .icon-cross2:hover,
  .raw-viewer-detail .metadata:hover {
    opacity: 1;
  }

  .raw-viewer-detail th {
    text-align: right;
    padding-right: 5px;
  }

  .raw-viewer-detail img {
    object-fit: contain;
    transition: opacity 0.5s ease-out;
  }

  .raw-viewer-detail.loading img {
    opacity: 0.75;
    image-rendering: pixelated;
  }

  .raw-viewer-tile.loading:after {
    content: " ";
    display: block;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0);
    transform: translateX(-50%) translateY(-50%);
    animation: infinite loading 2s ease-in;
  }

  @keyframes loading {
    0% {
      width: 25%;
      height: 25%;
      background: rgba(0,0,0,0);
    }
    50% {
      background: rgba(0,0,0,0.25);
    }
    100% {
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0);
    }
  }

  .raw-viewer-toolbar > * {
    border: 0 !important;
    background: none !important;
    line-height: 28px;
    font-size: 14px;
    padding: 0 8px;
    color: white;
    opacity: 0.8;
    border-radius: 4px;
  }

  .raw-viewer-toolbar input {
    display: none;
  }

  .raw-viewer-toolbar .tag-off {
    filter: brightness(2) grayscale(100%);
    transition: 0.25s ease-out;
  }

  .raw-viewer-toolbar .tag-on {
    opacity: 1.0;
    filter: none;
  }

  .blurred:after {
    content: attr(data-yape);
    background: rgba(255,0,0,0.5);
    color: white;
    position: absolute;
    line-height: 14px;
    padding: 2px 4px;
    top: 0;
    right: 0;
  }

  .raw-viewer-component .filters {
    color: white;
    display: flex;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    padding: 0 10px;
    background: rgba(0,0,0,0.5);
    overflow: hidden;
  }

  .raw-viewer-component  .filters > * {
    white-space: nowrap;
    flex-shrink: 0;
  }

  .raw-viewer-component .filters > *+* {
    margin-left: 10px;
  }

  .raw-viewer-component .filters input[type="date"] {
    width: 140px;
  }`,

  html:`
  <div
    class="raw-viewer-scroller"
    data-bind="class(one-column)=_component_.rawfile"
    data-biggrid-padding="16,16"
  >
    <div
      class="raw-viewer-tile"
      data-bind="
        class(loading)=.generating_preview;
        class(blurred)=.blurred;
        data(yape)=.yape;
      "
      data-list="_component_.slice(_component_.rawfiles):_auto_"
      data-event="mouseup,keydown(Space):_component_.pick"
      tabindex="0"
    >
      <img data-bind="
        img=$\{.preview};
      ">
      <span data-bind="text=.filename"></span>
    </div>
  </div>
  <div
    class="filters"
    data-bind="hide_if=_component_.rawfile"
    data-event="input,change:_component_.update_filter"
  >
    <label>
      Sort by
      <select data-bind="value=_component_.sort_by">
        <option value="date">Date</option>
        <option value="filename">File Name</option>
      </select>
    </label>
    <b style="color: white">Filters</b>
    <label>
      File Name
      <input data-bind="value=_component_.filter.filename">
    </label>
    <label>
      Date Range
      <input type="date" data-bind="value=_component_.filter.min_date">
      to
      <input type="date" data-bind="value=_component_.filter.max_date">
    </label>
    <label>
      Tags
      <input data-bind="value=_component_.filter.tags">
    </label>
  </div>
  <div
    class="raw-viewer-detail"
    data-bind="
      class(loading)=_component_.rawfile.generating_fullsize;
      show_if=_component_.rawfile;
    "
  >
    <img data-bind="img=_component_.rawfile.fullsize">
    <div
      class="icon-cross2"
      data-event="mouseup:_component_.closeDetail"
    ></div>
    <table
      class="metadata"
    >
      <tr data-bind="show_if=_component_.rawfile.metadata.Name">
        <th>Display Name</th>
        <td data-bind="text=_component_.rawfile.metadata.Name"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.CreationDate">
        <th>Creation Date</th>
        <td data-bind="timestamp()=_component_.rawfile.metadata.CreationDate"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.Size">
        <th>Finder Comment</th>
        <td data-bind="text=$\{_component_.rawfile.metadata.FinderComment}"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.Model">
        <th>Camera</th>
        <td data-bind="text=_component_.rawfile.metadata.Model"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.LensModel">
        <th>Lens</th>
        <td data-bind="text=_component_.rawfile.metadata.LensModel"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.FocalLength">
        <th>Focal Length</th>
        <td data-bind="text=$\{_component_.rawfile.metadata.FocalLength}mm"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.FocalLength35mm">
        <th>35mm equiv.</th>
        <td data-bind="text=$\{_component_.rawfile.metadata.FocalLength35mm}mm"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.FNumber">
        <th>Aperture</th>
        <td data-bind="text=_component_.rawfile.metadata.FNumber"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.ExposureTimeSeconds">
        <th>Shutter Speed</th>
        <td data-bind="text=_component_.rawfile.metadata.ExposureTimeSeconds"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.ISOSpeed">
        <th>ISO</th>
        <td data-bind="text=_component_.rawfile.metadata.ISOSpeed"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.PixelWidth">
        <th>Resolution</th>
        <td data-bind="text=$\{_component_.rawfile.metadata.PixelWidth} ⨉ $\{_component_.rawfile.metadata.PixelHeight}"></td>
      </tr>
      <tr data-bind="show_if=_component_.rawfile.metadata.Size">
        <th>File Size</th>
        <td data-bind="bytes=$\{_component_.rawfile.metadata.Size}"></td>
      </tr>
      <tr>
        <td class="raw-viewer-toolbar" colspan="2">
          <button data-event="click:_component_.edit">Edit</button>
          <button data-event="click:_component_.reveal">Reveal</button>
          <button data-event="click:_component_.preview">Preview</button>
          <label>
            <input
              type="checkbox"
              data-bind="checked=_component_.rawfile.tags.favorite"
              data-event="change:_component_.tag"
            ><span data-bind="class(tag-on|tag-off)=_component_.rawfile.tags.favorite">❤️</span></label>
          <label>
            <input
              type="checkbox"
              data-bind="checked=_component_.rawfile.tags.star"
              data-event="change:_component_.tag"
            ><span data-bind="class(tag-on|tag-off)=_component_.rawfile.tags.star">⭐️</span></label>
          <label>
            <input
              type="checkbox"
              data-bind="checked=_component_.rawfile.tags.flag"
              data-event="change:_component_.tag"
            ><span data-bind="class(tag-on|tag-off)=_component_.rawfile.tags.flag">🚩</span></label>
          <button data-event="click:_component_.trash" style="float: right">Trash</button>
        </td>
      </tr>
    </table>
  </div>`,
  load: async ({ get, set, component, b8r, touch, findOne }) => {
    const {biggrid} = await import('//node_modules/@tonioloewald/b8r/lib/biggrid.js');
    const {imagePromise} = await import('//node_modules/@tonioloewald/b8r/source/b8r.imgSrc.js');
    const {viaTag} = await import('//node_modules/@tonioloewald/b8r/lib/scripts.js');
    const {jsfeat} = await viaTag('./node_modules/@tonioloewald/b8r/third-party/jsfeat-min.js');
    const {resize, relayTo} = await import('//node_modules/@tonioloewald/b8r/lib/resize.js');
    const {isElectron} = await import('//node_modules/@tonioloewald/b8r/lib/runtime-environment.js');
    const scroller = findOne('.raw-viewer-scroller');

    if (! isElectron || window.process.platform !== 'darwin') {
      b8r.hide(component);
      return;
    }

    if (! component.matches('.example')) {
      document.body.style.overflow = 'hidden';
    }

    relayTo(scroller);

    /* electron-require */
    const fs = require('fs');
    const {exec} = require('child_process');

    const MAX_PROCESSING = 4;
    const PREVIEW_SIZE = 256;
    const PREGENERATE_PREVIEWS = true;
    const PREVIEW_PATH = `/tmp/thumbs-${PREVIEW_SIZE}`;
    const FULLSIZE_PATH = `/tmp/fullsize`;
    let rawfiles_visible = [];
    let processing = 0;

    const canvas = b8r.create('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context2d = canvas.getContext('2d');

    const reportError = err => { if (err) console.error(err); };

    const extract_date = datestring => datestring.match(/[0-9]{4,4}-[0-9]{2,2}-[0-9]{2,2}/)[0];
    const filter = {filename: '', tags: ''};
    filter.min_date = filter.max_date = extract_date(new Date().toISOString());
    set({filter});
    set({sort_by: 'date'});

    const process = rawfile => {
      const {_auto_, filepath, tags} = rawfile;
      const preview = `${PREVIEW_PATH}/${rawfile.filename}.png`;
      //console.log('generating', preview, {processing, waiting: waiting.length});
      set(`rawfiles[_auto_=${_auto_}].generating_preview`, true);

      const done = () => {
        // if the component has been removed, allows processing to stop cleanly
        if(document.body.contains(component)) {
          set(`rawfiles[_auto_=${_auto_}].generating_preview`, false);
          set(`rawfiles[_auto_=${_auto_}].preview`, 'file://' + preview);
          imagePromise('file://' + preview).then(img => {
            /*
            // FAST
            jsfeat.fast_corners.set_threshold(50);
            // YAPE06
            jsfeat.yape06.laplacian_threshold = 25;
            jsfeat.yape06.min_eigen_value_threshold = 75;
            */
            // YAPE
            jsfeat.yape.init(256, 256, 3, 1);

            const corners = [], border=2;
            // you should use preallocated keypoint_t array
            for(let i = 0; i < 256 * 256; ++i) {
              corners[i] = new jsfeat.keypoint_t(0,0,0,0);
            }
            const img_u8 = new jsfeat.matrix_t(256, 256, jsfeat.U8_t | jsfeat.C1_t);
            context2d.drawImage(img, 0, 0, 256, 256);
            const imageData = context2d.getImageData(0, 0, 256, 256);
            jsfeat.imgproc.grayscale(imageData.data, 256, 256, img_u8);
            jsfeat.imgproc.equalize_histogram(img_u8, img_u8);
            // const fast = jsfeat.fast_corners.detect(img_u8, corners, border);
            // const yape06 = jsfeat.yape06.detect(img_u8, corners, border);
            const yape = jsfeat.yape.detect(img_u8, corners, border);
            set(`rawfiles[_auto_=${_auto_}].yape`, yape);
            if (yape < 100) {
              set(`rawfiles[_auto_=${_auto_}].blurred`, true);
            }
          });
          processing -= 1;
          dequeue();
        }
      };

      const get_preview = () => {
        fs.access(preview, fs.constants.R_OK, err => {
          if (err) {
            // const rot = rawfile.metadata.Orientation === '1' ? -90 : 0;
            exec(
              `mkdir -p ${PREVIEW_PATH} && ` +
              `qlmanage -t -s ${PREVIEW_SIZE} -o ${PREVIEW_PATH} "${filepath}"`,
              // `sips -s format jpeg -r ${rot} -s formatOptions 75 -Z ${PREVIEW_SIZE} "${filepath}" --out "${preview}"`,
              err => {
                if (err) {
                  console.error(`${filepath} RAW conversion failed`, err);
                } else {
                  done();
                }
              }
            );
          } else {
            done();
          }
        });
      };

      exec(
        `mdls "${filepath}"`,
        (err, stdout) => {
          if (err) {
            console.error(`${filepath} metadata extraction failed`, err);
          } else {
            const metadata = {};
            stdout.split('\nkMD').forEach(item => {
              const [_key, value] = item.split('=').map(s => s.trim());
              const key = _key.replace(/^(FS)?(Item)?(FS)?(Content)?(Acquisition)?(Display)?/, '');
              if (key && !value.match(/^(\s+|\(null\))$/)) {
                metadata[key] = value.indexOf('(') === -1
                                ? value.match(/^"*(.*?)"*$/m)[1] // strip outer quotation marks
                                : value.match(/\w[^,)"]*/g).map(s => s.trim());
              }
            });
            const creation_date = extract_date(metadata.CreationDate);
            if (creation_date && creation_date < filter.min_date) {
              filter.min_date = creation_date;
              touch('filter.min_date');
            }
            if (metadata.UserTags) {
              metadata.UserTags.forEach(t => tags[t] = true);
              touch(`rawfiles[_auto_=${_auto_}].tags`);
            }
            if (metadata.ExposureTimeSeconds < 1) {
              metadata.ExposureTimeSeconds = '1/' + Math.round(1/metadata.ExposureTimeSeconds);
            }
            set(`rawfiles[_auto_=${_auto_}].metadata`, metadata);
            get_preview();
          }
        }
      );
    };

    const dequeue = () => {
      if (processing >= MAX_PROCESSING) {
        return;
      }

      const waiting = rawfiles_visible.filter(f => ! f.preview);
      const list = waiting.length || ! PREGENERATE_PREVIEWS ? waiting : get('rawfiles').filter(f => ! f.preview);
      while(processing < MAX_PROCESSING && list.length) {
        const rand = Math.floor(Math.random() * list.length);
        processing += 1;
        const rawfile = list.splice(rand, 1)[0];
        process(rawfile);
        // if list is waiting_on_screen we also need to remove item from waiting
        if (waiting.indexOf(rawfile) > -1) {
          waiting.splice(waiting.indexOf(rawfile), 1);
        }
      }
    };

    const findFiles = extension => {
      const rawfiles = get('rawfiles');
      exec(
        `mdfind "kMDItemDisplayName == '*.${extension}'"`,
        {maxBuffer: 1024 * 10000}, // 10MB buffer because
        (err, stdout) => {
          if (err) {
            console.error('spotlight search failed', err);
          } else {
            stdout.split('\n').
            filter(f => !!f).
            forEach(
              filepath => {
                const filename = filepath.split('/').pop();
                if (filename[0] !== '.') { // skip hidden files
                  rawfiles.push({
                    filename,
                    basename: filename.split('.').slice(0,-1).join('.'),
                    filepath,
                    tags: {},
                  });
                }
              }
            );
            set({rawfiles});
          }
        }
      );
    };

    const pick = evt => {
      const rawfile = b8r.getListInstance(evt.target);

      if (!rawfile.fullsize) {
        const {filepath} = rawfile;
        rawfile.fullsize = rawfile.preview;
        const fullsize = `${FULLSIZE_PATH}/${rawfile.basename}.jpg`;
        rawfile.generating_fullsize = true;
        const rot = rawfile.metadata.Orientation === '1' ? -90 : 0;
        exec(
          `mkdir -p ${FULLSIZE_PATH} && ` +
          `sips -s format jpeg -r ${rot} -s formatOptions 90 "${filepath}" --out "${fullsize}"`,
          err => {
            if (err) {
              console.error(`${filepath} RAW conversion failed`, err);
            } else {
              imagePromise('file://' + fullsize).
              then(() => {
                rawfile.generating_fullsize = false;
                rawfile.fullsize = 'file://' + fullsize;
                touch('rawfile');
              });
            }
          }
        );
      } else {
        rawfile.generating_fullsize = false;
      }
      set({rawfile});
      console.log(rawfile);
      b8r.trigger('resize', scroller);
    };

    const closeDetail = () => {
      set('rawfile', null);
      b8r.afterUpdate(() => b8r.trigger('resize', scroller));
    };

    const sort_methods = {
      date: (a, b) => !a.metdata || !b.metadata ? 0 :
                      a.metadata.CreationDate < b.metadata.CreationDate ? -1 : 1,
      filename: (a, b) => a.filename < b.filename ? -1 : 1,
    };

    const slice = (list, container) => {
      const filter = get('filter');
      const required_tags = (filter.tags || '').split(',').map(s => s.trim()).filter(s => !!s);
      const filtered = list.filter(rawfile => {
        const {CreationDate} = rawfile.metadata || {};
        const created = CreationDate ? extract_date(CreationDate) : false;
        return (!filter.filename || rawfile.filename.includes(filter.filename)) &&
               (
                 !rawfile.tags ||
                 required_tags.filter(t => rawfile.tags[t]).length === required_tags.length
               ) &&
               (!created || (created >= filter.min_date && created <= filter.max_date));
      });
      rawfiles_visible = biggrid.slice(filtered.sort(sort_methods[get('sort_by')]), container);
      dequeue();
      return rawfiles_visible;
    };

    const edit = () => {
      exec(`open "${get('rawfile.filepath')}"`, reportError);
    };
    const reveal = () => {
      exec(`open -R "${get('rawfile.filepath')}"`, reportError);
    };
    const preview = () => {
      exec(`qlmanage -p "${get('rawfile.filepath')}"`, reportError);
    };
    const tag = () => {
      const {tags, filepath} = get('rawfile');
      const xml = b8r.filterKeys(tags, v => v).map(t => `<string>${t}</string>`).join('');
      const command = `xattr -w com.apple.metadata:_kMDItemUserTags '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><array>${xml}</array></plist>' "${filepath}"`;
      exec(command, reportError);
    };
    const update_filter = b8r.debounce(() => touch('rawfiles'), 500);
    const trash = () => {
      const rawfile = get('rawfile');
      const rawfiles = get('rawfiles');
      rawfiles.splice(rawfiles.indexOf(rawfile), 1);
      exec(`mv "${rawfile.filepath}" ~/.Trash`);
      closeDetail();
      set('rawfile', null);
      touch('rawfiles');
    };

    set({slice, pick, closeDetail, rawfiles: [], edit, reveal, preview, tag, update_filter, trash});

    // This is where we decide which kinds of files to look for
    // I haven't tried to import everything -- https://en.wikipedia.org/wiki/Raw_image_format
    findFiles('NEF'); // Nikon
    findFiles('DNG'); // Adobe DNG files are used by a lot of cameras
    findFiles('CR2'); // Canon
    findFiles('RW2'); // Panasonic

    // Not tested
    findFiles('ARW'); // Sony
    findFiles('RAF'); // Fuji
    findFiles('ORF'); // Olympus
  }
}