/**
 * Copyright 2014 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module Shumway {
  import assert = Shumway.Debug.assert;
  import SWFFile = Shumway.SWF.SWFFile;

  // Minimal amount of data to load before starting to parse. Chosen fairly arbitrarily.
  var MIN_LOADED_BYTES = 8192;

  export class LoadProgressUpdate {
    constructor(public bytesLoaded: number) {
    }
  }
  export interface ILoadListener {
    onLoadOpen: (any) => void;
    onLoadProgress: (update: LoadProgressUpdate) => void;
    onLoadComplete: () => void;
    onLoadError: () => void;
  }

  // Since we are starting to parse data at file object construction, we need
  // to pass some additional parameters, e.g. to make SWFFile font loading working.
  export interface ILoadContext {
    fontLoader: SWF.IFontLoader;
  }

  export class FileLoader {
    _file: any; // {SWFFile|ImageFile}

    private _listener: ILoadListener;
    private _context: ILoadContext;
    private _loadingServiceSession: FileLoadingSession;
    private _delayedUpdatesPromise: Promise<any>;
    private _bytesLoaded: number;
    private _queuedInitialData: Uint8Array;

    constructor(listener: ILoadListener, context: ILoadContext) {
      release || assert(listener);
      release || assert(context);
      this._file = null;
      this._listener = listener;
      this._context = context;
      this._loadingServiceSession = null;
      this._delayedUpdatesPromise = null;
      this._bytesLoaded = 0;
    }

    // TODO: strongly type
    loadFile(request: any) {
      this._bytesLoaded = 0;
      var session = this._loadingServiceSession = FileLoadingService.instance.createSession();
      session.onopen = this.processLoadOpen.bind(this);
      session.onprogress = this.processNewData.bind(this);
      session.onerror = this.processError.bind(this);
      session.onclose = this.processLoadClose.bind(this);
      session.open(request);
    }
    abortLoad() {
      // TODO: implement
    }
    loadBytes(bytes: Uint8Array) {
      this._bytesLoaded = bytes.length;
      var file = this._file = createFileInstanceForHeader(bytes, bytes.length, this._context);
      this._listener.onLoadOpen(file);
      this.processSWFFileUpdate(file);
    }
    processLoadOpen() {
      release || assert(!this._file);
    }
    processNewData(data: Uint8Array, progressInfo: {bytesLoaded: number; bytesTotal: number}) {
      this._bytesLoaded += data.length;
      if (this._bytesLoaded < MIN_LOADED_BYTES && this._bytesLoaded < progressInfo.bytesTotal) {
        if (!this._queuedInitialData) {
          this._queuedInitialData = new Uint8Array(Math.min(MIN_LOADED_BYTES,
                                                            progressInfo.bytesTotal));
        }
        this._queuedInitialData.set(data, this._bytesLoaded - data.length);
        return;
      } else if (this._queuedInitialData) {
        var allData = new Uint8Array(this._bytesLoaded);
        allData.set(this._queuedInitialData);
        allData.set(data, this._bytesLoaded - data.length);
        data = allData;
        this._queuedInitialData = null;
      }
      var file = this._file;
      if (!file) {
        file = this._file = createFileInstanceForHeader(data, progressInfo.bytesTotal, this._context);
        this._listener.onLoadOpen(file);
      } else {
        file.appendLoadedData(data);
      }
      if (file instanceof SWFFile) {
        this.processSWFFileUpdate(file);
      } else {
        release || assert(file instanceof ImageFile);
        this._listener.onLoadProgress(new LoadProgressUpdate(progressInfo.bytesLoaded));
        if (progressInfo.bytesLoaded === progressInfo.bytesTotal) {
          <ImageFile>file.decodingPromise.then(this._listener.onLoadComplete.bind(this._listener));
        }
      }
    }
    processError(error) {
      Debug.warning('Loading error encountered:', error);
    }
    processLoadClose() {
      if (this._file.bytesLoaded !== this._file.bytesTotal) {
        Debug.warning("Not Implemented: processing loadClose when loading was aborted");
      }
    }

    private processSWFFileUpdate(file: SWFFile) {
      var update = new LoadProgressUpdate(file.bytesLoaded);
      if (!(file.pendingSymbolsPromise || this._delayedUpdatesPromise)) {
        this._listener.onLoadProgress(update);
        return;
      }
      var promise = Promise.all([file.pendingSymbolsPromise, this._delayedUpdatesPromise]);
      var self = this;
      promise.then(function () {
        self._listener.onLoadProgress(update);
        if (self._delayedUpdatesPromise === promise) {
          self._delayedUpdatesPromise = null;
        }
      });
    }
  }

  function createFileInstanceForHeader(header: Uint8Array, fileLength: number, context: ILoadContext): any {
    var magic = (header[0] << 16) | (header[1] << 8) | header[2];

    if ((magic & 0xffff) === FileTypeMagicHeaderBytes.SWF /* SWF */) {
      // TODO refactor file object construction to split header and actual data parsing
      // and move context parameters assignment during onLoadOpen
      return new SWFFile(header, fileLength, context.fontLoader);
    }

    if (magic === FileTypeMagicHeaderBytes.JPG) {
      return new ImageFile(header, fileLength);
    }
    if (magic === FileTypeMagicHeaderBytes.PNG) {
      return new ImageFile(header, fileLength);
    }

    // TODO: throw instead of returning null? Perhaps?
    return null;
  }

  enum FileTypeMagicHeaderBytes {
    SWF = 0x5753,
    JPG = 0xffd8ff,
    PNG = 0x89504e
  }
}
