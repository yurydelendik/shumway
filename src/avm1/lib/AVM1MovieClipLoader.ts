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

///<reference path='../references.ts' />

module Shumway.AVM1.Lib {
  import flash = Shumway.AVM2.AS.flash;

  export class AVM1MovieClipLoader {
    static createAVM1Class():typeof AVM1MovieClipLoader {
      var wrapped = wrapAVM1Class(AVM1MovieClipLoader,
        [],
        ['loadClip', 'unloadClip', 'getProgress']);
      AVM1Broadcaster.initialize(wrapped.asGetPublicProperty('prototype'));
      return wrapped;
    }

    private _loader: flash.display.Loader;
    private _target: IAVM1SymbolBase;

    constructor() {
      this._loader = new flash.display.Loader();
      initDefaultListeners(this);
    }

    public loadClip(url: string, target):Boolean {
      this._target = typeof target === 'number' ?
        AVM1Utils.resolveLevel(target) : AVM1Utils.resolveTarget(target);

      (<flash.display.DisplayObjectContainer>this._target.as3Object).addChild(this._loader);

      this._loader.contentLoaderInfo.addEventListener(flash.events.Event.OPEN, this.openHandler);
      this._loader.contentLoaderInfo.addEventListener(flash.events.ProgressEvent.PROGRESS, this.progressHandler);
      this._loader.contentLoaderInfo.addEventListener(flash.events.IOErrorEvent.IO_ERROR, this.ioErrorHandler);
      this._loader.contentLoaderInfo.addEventListener(flash.events.Event.COMPLETE, this.completeHandler);
      this._loader.contentLoaderInfo.addEventListener(flash.events.Event.INIT, this.initHandler);

      this._loader.load(new flash.net.URLRequest(url));
      // TODO: find out under which conditions we should return false here
      return true;
    }

    public unloadClip(target):Boolean {
      var nativeTarget: IAVM1SymbolBase = typeof target === 'number' ?
        AVM1Utils.resolveLevel(target) : AVM1Utils.resolveTarget(target);

      (<flash.display.DisplayObjectContainer>nativeTarget.as3Object).removeChild(this._loader);
      // TODO: find out under which conditions unloading a clip can fail
      return true;
    }

    public getProgress(target): number {
      return this._loader.contentLoaderInfo.bytesLoaded;
    }

    private openHandler(event: flash.events.Event): void {
      this.asCallPublicProperty('broadcastMessage', ['onLoadStart', this._target]);
    }

    private progressHandler(event: flash.events.ProgressEvent):void {
      this.asCallPublicProperty('broadcastMessage', ['onLoadProgress',
        this._target, event.bytesLoaded, event.bytesTotal]);
    }

    private ioErrorHandler(event: flash.events.IOErrorEvent):void {
      this.asCallPublicProperty('broadcastMessage', ['onLoadError',
        this._target, event.errorID, 501]);
    }

    private completeHandler(event: flash.events.Event):void {
      this.asCallPublicProperty('broadcastMessage', ['onLoadComplete', this._target]);
    }

    private initHandler(event: flash.events.Event):void {
      // MovieClipLoader's init event is dispatched after all frame scripts of the AVM1 instance
      // have run for one additional iteration.
      this._target.as3Object.addEventListener(flash.events.Event.EXIT_FRAME, this.self_exitFrame);
    }

    private self_exitFrame(event: flash.events.Event):void {
      this.asCallPublicProperty('broadcastMessage', ['onLoadInit', this._target]);
      this._target.as3Object.removeEventListener(flash.events.Event.EXIT_FRAME, this.self_exitFrame);
    }
  }
}