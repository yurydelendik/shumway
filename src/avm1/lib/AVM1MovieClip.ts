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
  import assert = Shumway.Debug.assert;

  import Multiname = Shumway.AVM2.ABC.Multiname;
  import resolveMultinameProperty = Shumway.AVM2.Runtime.resolveMultinameProperty;

  var _asGetProperty = Object.prototype.asGetProperty;
  var _asSetProperty = Object.prototype.asSetProperty;
  var _asCallProperty = Object.prototype.asCallProperty;
  var _asHasProperty = Object.prototype.asHasProperty;
  var _asHasOwnProperty = Object.prototype.asHasOwnProperty;
  var _asHasTraitProperty = Object.prototype.asHasTraitProperty;
  var _asDeleteProperty = Object.prototype.asDeleteProperty;
  var _asGetEnumerableKeys = Object.prototype.asGetEnumerableKeys;

  export class AVM1MovieClip extends AVM1SymbolBase<flash.display.MovieClip> {
    public static createAVM1Class(): typeof AVM1MovieClip {
      var wrapped = wrapAVM1Class(AVM1MovieClip,
        [],
        ['_alpha', 'attachAudio', 'attachBitmap', 'attachMovie',
          'beginFill', 'beginBitmapFill', 'beginGradientFill', 'blendMode',
          'cacheAsBitmap', '_callFrame', 'clear', 'createEmptyMovieClip',
          'createTextField', '_currentframe', 'curveTo', '_droptarget',
          'duplicateMovieClip', 'enabled', 'endFill', 'filters', '_framesloaded',
          'focusEnabled', '_focusrect', 'forceSmothing', 'getBounds',
          'getBytesLoaded', 'getBytesTotal', 'getDepth', 'getInstanceAtDepth',
          'getNextHighestDepth', 'getRect', 'getSWFVersion', 'getTextSnapshot',
          'getURL', 'globalToLocal', 'gotoAndPlay', 'gotoAndStop', '_height',
          '_highquality', 'hitArea', 'hitTest', 'lineGradientStyle', 'listStyle',
          'lineTo', 'loadMovie', 'loadVariables', 'localToGlobal', '_lockroot',
          'menu', 'moveTo', '_name', 'nextFrame', 'opaqueBackground', '_parent',
          'play', 'prevFrame', '_quality', 'removeMovieClip', '_rotation',
          'scale9Grid', 'scrollRect', 'setMask', '_soundbuftime', 'startDrag',
          'stop', 'stopDrag', 'swapDepths', 'tabChildren', 'tabEnabled', 'tabIndex',
          '_target', '_totalframes', 'trackAsMenu', 'transform', 'toString',
          'unloadMovie', '_url', 'useHandCursor', '_visible', '_width',
          '_x', '_xmouse', '_xscale', '_y', '_ymouse', '_yscale']);
      AVM1MovieClip._initEventsHandlers(wrapped);
      return wrapped;
    }

    private _boundExecuteFrameScripts: () => void;
    private _frameScripts: AVM1.AVM1ActionsData[][];

    constructor() {
      super();
      // TODO fail or do nothing?
    }

    private get graphics() : flash.display.Graphics {
      return this.as3Object.graphics;
    }

    public initAVM1Instance(as3Object: flash.display.MovieClip, context: AVM1Context) {
      super.initAVM1Instance(as3Object, context);

      this._frameScripts = null;
      this._boundExecuteFrameScripts = null;

      initDefaultListeners(this);
    }

    public __lookupChild(id: string) {
      if (id == '.') {
        return this;
      } else if (id == '..') {
        return getAVM1Object(this.as3Object.parent, this.context);
      } else {
        return getAVM1Object(this._lookupChildByName(id), this.context);
      }
    }

    private _lookupChildByName(name: string): flash.display.DisplayObject {
      name = asCoerceString(name);
      return this.as3Object._lookupChildByName(name);
    }

    public get __targetPath() {
      var target = this._target;
      var prefix = '_level0'; // TODO use needed level number here
      return target != '/' ? prefix + target.replace(/\//g, '.') : prefix;
    }

    public get _alpha() {
      return this.as3Object.alpha;
    }

    public set _alpha(value) {
      this.as3Object.alpha = value;
    }

    public attachAudio(id) {
      throw 'Not implemented: attachAudio';
    }

//    public attachBitmap(bmp:AVM1BitmapData, depth:number, pixelSnapping:String = 'auto', smoothing:Boolean = false):void {
//      var bitmap:flash.display.Bitmap = construct(flash.display.Bitmap, [bmp, pixelSnapping, smoothing]);
//      this._insertChildAtDepth(bitmap, depth);
//    }

    public _constructMovieClipSymbol(symbolId:string, name:string):flash.display.MovieClip {
      var symbol = AVM1Context.instance.getAsset(symbolId);
      if (!symbol) {
        return undefined;
      }

      var props:Timeline.SpriteSymbol = Object.create(symbol.symbolProps);
      props.avm1Name = name;
      props.avm1SymbolClass = symbol.theClass;

      var mc:flash.display.MovieClip = flash.display.MovieClip.initializeFrom(props);
      flash.display.MovieClip.instanceConstructorNoInitialize.call(mc);

      return mc;
    }

    public attachMovie(symbolId, name, depth, initObject) {
      var mc = this._constructMovieClipSymbol(symbolId, name);
      if (!mc) {
        return undefined;
      }

      var as2mc = this._insertChildAtDepth(mc, depth);

      for (var i in initObject) {
        as2mc[i] = initObject[i];
      }

      return as2mc;
    }

    public beginFill(color, alpha) {
      this.graphics.beginFill(color, alpha);
    }

    public beginBitmapFill(bmp, matrix, repeat, smoothing) {
      if (!(bmp instanceof flash.display.BitmapData))
      {
        return;
      }

      this.graphics.beginBitmapFill(bmp, matrix, repeat, smoothing);
    }

    public beginGradientFill(fillType, colors, alphas, ratios, matrix, spreadMethod, interpolationMethod, focalPointRatio) {
      this.graphics.beginGradientFill(fillType, colors, alphas, ratios, matrix, spreadMethod, interpolationMethod, focalPointRatio);
    }

    public get blendMode() {
      return this.as3Object.blendMode;
    }

    public set blendMode(value) {
      this.as3Object.blendMode = value;
    }

    public get cacheAsBitmap() {
      return this.as3Object.cacheAsBitmap;
    }

    public set cacheAsBitmap(value) {
      this.as3Object.cacheAsBitmap = value;
    }

    public _callFrame(frame:any):any {
      var nativeAS3Object = <any> this.as3Object;
      nativeAS3Object._callFrame(frame);
    }

    public clear() {
      this.graphics.clear();
    }

    private _insertChildAtDepth<T extends flash.display.DisplayObject>(mc: T, depth:number): AVM1SymbolBase<T> {
      var nativeAS3Object = this.as3Object;
      nativeAS3Object.addTimelineObjectAtDepth(mc, Math.min(nativeAS3Object.numChildren, depth));
      // Bitmaps aren't reflected in AVM1, so the rest here doesn't apply.
      if (flash.display.Bitmap.isType(mc)) {
        return null;
      }
      var as2mc = getAVM1Object(mc, this.context);
      return as2mc;
    }

    public createEmptyMovieClip(name, depth): AVM1MovieClip {
      var mc: flash.display.MovieClip = new flash.display.MovieClip();
      mc.name = name;
      return <AVM1MovieClip>this._insertChildAtDepth(mc, depth);
    }

    public createTextField(name, depth, x, y, width, height): AVM1TextField {
      var text: flash.text.TextField = new flash.text.TextField();
      text.name = name;
      text.x = x;
      text.y = y;
      text.width = width;
      text.height = height;
      return <AVM1TextField>this._insertChildAtDepth(text, depth);
    }

    public get _currentframe() {
      return this.as3Object.currentFrame;
    }

    public curveTo(controlX, controlY, anchorX, anchorY) {
      this.graphics.curveTo(controlX, controlY, anchorX, anchorY);
    }

    public get _droptarget() {
      return this.as3Object.dropTarget;
    }

    private  _duplicate(name:any, depth:any, initObject:any):any {
      var nativeAS3Object = <any> this.as3Object;
      nativeAS3Object._duplicate(name, depth, initObject);
    }

    public duplicateMovieClip(name, depth, initObject): AVM1MovieClip {
      var mc = this._duplicate(name, +depth, initObject);
      return getAVM1Object(mc, this.context);
    }

    public get enabled() {
      return this.as3Object.enabled;
    }

    public set enabled(value) {
      this.as3Object.enabled = value;
    }

    public endFill() {
      this.graphics.endFill();
    }

    public get filters() {
      throw 'Not implemented: get$filters';
    }

    public set filters(value) {
      throw 'Not implemented: set$filters';
    }

    public get focusEnabled() {
      throw 'Not implemented: get$focusEnabled';
    }

    public set focusEnabled(value) {
      throw 'Not implemented: set$focusEnabled';
    }

    public get _focusrect() {
      throw 'Not implemented: get$_focusrect';
    }

    public set _focusrect(value) {
      throw 'Not implemented: set$_focusrect';
    }

    public get forceSmoothing() {
      throw 'Not implemented: get$forceSmoothing';
    }

    public set forceSmoothing(value) {
      throw 'Not implemented: set$forceSmoothing';
    }

    public get _framesloaded() {
      return this.as3Object.framesLoaded;
    }

    public getBounds(bounds) {
      var obj = bounds.as3Object;
      if (!obj) {
        throw 'Unsupported bounds type';
      }
      return this.as3Object.getBounds(obj);
    }

    public getBytesLoaded(): number {
      var loaderInfo = this.as3Object.loaderInfo;
      return loaderInfo.bytesLoaded;
    }

    public getBytesTotal() {
      var loaderInfo = this.as3Object.loaderInfo;
      return loaderInfo.bytesTotal;
    }

    public getDepth() {
      return this.as3Object._depth;
    }

    public getInstanceAtDepth(depth: number): AVM1MovieClip {
      var nativeObject = this.as3Object;
      for (var i = 0, numChildren = nativeObject.numChildren; i < numChildren; i++) {
        var child = nativeObject._lookupChildByIndex(i);
        // child is null if it hasn't been constructed yet. This can happen in InitActionBlocks.
        if (child && child._depth === depth) {
          // Somewhat absurdly, this method returns the mc if a bitmap is at the given depth.
          if (flash.display.Bitmap.isType(child)) {
            return this;
          }
          return getAVM1Object(child, this.context);
        }
      }
      return null;
    }

    public getNextHighestDepth(): number {
      var nativeObject = this.as3Object;
      var maxDepth = 0;
      for (var i = 0, numChildren = nativeObject.numChildren; i < numChildren; i++) {
        var child = nativeObject._lookupChildByIndex(i);
        if (child._depth > maxDepth) {
          maxDepth = child._depth;
        }
      }
      return maxDepth + 1;
    }

    public getRect(bounds) {
      throw 'Not implemented: getRect';
    }

    public getSWFVersion() {
      var loaderInfo = this.as3Object.loaderInfo;
      return loaderInfo.swfVersion;
    }

    public getTextSnapshot() {
      throw 'Not implemented: getTextSnapshot';
    }

    public getURL(url, window, method) {
      var request = new flash.net.URLRequest(url);
      if (method) {
        request.method = method;
      }
      Shumway.AVM2.AS.FlashNetScript_navigateToURL(request, window);
    }

    public globalToLocal(pt) {
      var tmp: flash.geom.Point = this.as3Object.globalToLocal(
        new flash.geom.Point(pt.asGetPublicProperty('x'), pt.asGetPublicProperty('y')));
      pt.asSetPublicProperty('x', tmp.x);
      pt.asSetPublicProperty('y', tmp.y);
    }

    public gotoAndPlay(frame) {
      return this.as3Object.gotoAndPlay(frame);
    }

    public gotoAndStop(frame) {
      return this.as3Object.gotoAndStop(frame);
    }

    public get _height() {
      return this.as3Object.height;
    }

    public set _height(value) {
      if (isNaN(value)) {
        return;
      }
      this.as3Object.height = value;
    }

    public get _highquality() {
      return 1;
    }

    public set _highquality(value) {
    }

    public get hitArea() {
      throw 'Not implemented: get$hitArea';
    }

    public set hitArea(value) {
      throw 'Not implemented: set$hitArea';
    }

    public hitTest(x, y, shapeFlag) {
      if (x instanceof AVM1MovieClip) {
        return this.as3Object.hitTestObject((<AVM1MovieClip>x).as3Object);
      } else {
        return this.as3Object.hitTestPoint(x, y, shapeFlag);
      }
    }

    public lineGradientStyle(fillType, colors, alphas, ratios, matrix, spreadMethod, interpolationMethod, focalPointRatio) {
      this.graphics.lineGradientStyle(fillType, colors, alphas, ratios, matrix, spreadMethod, interpolationMethod, focalPointRatio);
    }

    public lineStyle(thickness, rgb, alpha, pixelHinting, noScale, capsStyle, jointStyle, miterLimit) {
      this.graphics.lineStyle(thickness, rgb, alpha, pixelHinting, noScale, capsStyle, jointStyle, miterLimit);
    }

    public lineTo(x, y) {
      this.graphics.lineTo(x, y);
    }

    public loadMovie(url: string, method: string) {
      var loader: flash.display.Loader = new flash.display.Loader();
      var request: flash.net.URLRequest = new flash.net.URLRequest(url);
      if (method) {
        request.method = method;
      }
      loader.load(request);
      function completeHandler(event: flash.events.Event):void {
        loader.removeEventListener(flash.events.Event.COMPLETE, completeHandler);
        var parent: flash.display.MovieClip = this.as3Object.parent;
        var depth = parent.getChildIndex(this.as3Object);
        parent.removeChild(this.as3Object);
        parent.addChildAt(loader.content, depth);
      }

      loader.addEventListener(flash.events.Event.COMPLETE, completeHandler);
    }

    public loadVariables(url, method) {
      throw 'Not implemented: loadVariables';
    }

    public localToGlobal(pt) {
      var tmp: flash.geom.Point = this.as3Object.localToGlobal(
        new flash.geom.Point(pt.asGetPublicProperty('x'), pt.asGetPublicProperty('y')));
      pt.asSetPublicProperty('x', tmp.x);
      pt.asSetPublicProperty('y', tmp.y);
    }

    public get _lockroot() {
      throw 'Not implemented: get$_lockroot';
    }

    public set _lockroot(value) {
      throw 'Not implemented: set$_lockroot';
    }

    public get menu() {
      return this.as3Object.contextMenu;
    }

    public set menu(value) {
      this.as3Object.contextMenu = value;
    }

    public moveTo(x, y) {
      this.graphics.moveTo(x, y);
    }

    public get _name() {
      return this.as3Object.name;
    }

    public set _name(value) {
      this.as3Object.name = value;
    }

    public nextFrame() {
      this.as3Object.nextFrame();
    }

    public nextScene() {
      this.as3Object.nextScene();
    }

    public get opaqueBackground() {
      return this.as3Object.opaqueBackground;
    }

    public set opaqueBackground(value) {
      this.as3Object.opaqueBackground = value;
    }

    public get _parent(): AVM1MovieClip {
      var parent = getAVM1Object(this.as3Object.parent, this.context);
      // In AVM1, the _parent property is `undefined`, not `null` if the element has no parent.
      return parent || undefined;
    }

    public set _parent(value) {
      throw 'Not implemented: set$_parent';
    }

    public play() {
      this.as3Object.play();
    }

    public prevFrame() {
      this.as3Object.prevFrame();
    }

    public prevScene() {
      this.as3Object.prevScene();
    }

    public get _quality() {
      return 'HIGH';
    }

    public set _quality(value) {
    }

    public removeMovieClip() {
      var parent = this._parent.as3Object;
      parent.removeChild(this.as3Object);
    }

    public get _rotation() {
      return this.as3Object.rotation;
    }

    public set _rotation(value) {
      this.as3Object.rotation = value;
    }

    public get scale9Grid() {
      throw 'Not implemented: get$scale9Grid';
    }

    public set scale9Grid(value) {
      throw 'Not implemented: set$scale9Grid';
    }

    public get scrollRect() {
      throw 'Not implemented: get$scrollRect';
    }

    public set scrollRect(value) {
      throw 'Not implemented: set$scrollRect';
    }

    public setMask(mc:Object) {
      var nativeObject = this.as3Object;
      var mask = AVM1Utils.resolveMovieClip(mc);
      if (mask) {
        nativeObject.mask = mask.as3Object;
      }
    }

    public get _soundbuftime() {
      throw 'Not implemented: get$_soundbuftime';
    }

    public set _soundbuftime(value) {
      throw 'Not implemented: set$_soundbuftime';
    }

    public startDrag(lock, left, top?, right?, bottom?) {
      this.as3Object.startDrag(lock, arguments.length < 3 ? null :
        new flash.geom.Rectangle(left, top, right - left, bottom - top));
    }

    public stop() {
      return this.as3Object.stop();
    }

    public stopDrag() {
      return this.as3Object.stopDrag();
    }

    public swapDepths(target:Object) {
      var child1 = this.as3Object;
      var child2 = typeof target === 'number' ?
        AVM1Utils.resolveLevel(Number(target)).as3Object :
        AVM1Utils.resolveTarget(target).as3Object;
      if (child1.parent !== child2.parent) {
        return; // must be the same parent
      }
      child1.parent.swapChildren(child1, child2);
    }

    public get tabChildren() {
      return this.as3Object.tabChildren;
    }

    public set tabChildren(value) {
      this.as3Object.tabChildren = value;
    }

    public get tabEnabled() {
      return this.as3Object.tabEnabled;
    }

    public set tabEnabled(value) {
      this.as3Object.tabEnabled = value;
    }

    public get tabIndex() {
      return this.as3Object.tabIndex;
    }

    public set tabIndex(value) {
      this.as3Object.tabIndex = value;
    }

    public get _target() {
      var nativeObject: flash.display.DisplayObject = this.as3Object;
      if (nativeObject === nativeObject.root) {
        return '/';
      }
      var path = '';
      do {
        path = '/' + nativeObject.name + path;
        nativeObject = nativeObject.parent;
      } while (nativeObject !== nativeObject.root);
      return path;
    }

    public get _totalframes() {
      return this.as3Object.totalFrames;
    }

    public get trackAsMenu() {
      throw 'Not implemented: get$trackAsMenu';
    }

    public set trackAsMenu(value) {
      throw 'Not implemented: set$trackAsMenu';
    }

    public get transform() {
      throw 'Not implemented: get$transform';
    }

    public set transform(value) {
      throw 'Not implemented: set$transform';
    }

    public toString() {
      return this.as3Object.toString();
    }

    public unloadMovie() {
      var nativeObject = this.as3Object;
      // TODO remove movie clip content
      var loader = nativeObject.loaderInfo.loader;
      if (loader.parent) {
        loader.parent.removeChild(loader);
      }
      nativeObject.stop();
    }

    public get _url() {
      return this.as3Object.loaderInfo.url;
    }

    public get useHandCursor() {
      return this.as3Object.useHandCursor;
    }

    public set useHandCursor(value) {
      this.as3Object.useHandCursor = value;
    }

    public get _visible() {
      return this.as3Object.visible;
    }

    public set _visible(value) {
      this.as3Object.visible = +value !== 0;
    }

    public get _width() {
      return this.as3Object.width;
    }

    public set _width(value) {
      if (isNaN(value)) {
        return;
      }
      this.as3Object.width = value;
    }

    public get _x() {
      return this.as3Object.x;
    }

    public set _x(value) {
      if (isNaN(value)) {
        return;
      }
      this.as3Object.x = value;
    }

    public get _xmouse() {
      return this.as3Object.mouseX;
    }

    public get _xscale() {
      return this.as3Object.scaleX * 100;
    }

    public set _xscale(value) {
      if (isNaN(value)) {
        return;
      }
      this.as3Object.scaleX = value / 100;
    }

    public get _y() {
      return this.as3Object.y;
    }

    public set _y(value) {
      if (isNaN(value)) {
        return;
      }
      this.as3Object.y = value;
    }

    public get _ymouse() {
      return this.as3Object.mouseY;
    }

    public get _yscale() {
      return this.as3Object.scaleY * 100;
    }

    public set _yscale(value) {
      if (isNaN(value)) {
        return;
      }
      this.as3Object.scaleY = value / 100;
    }

    // Special and children names properties resolutions

    private _resolveLevelNProperty(name): AVM1MovieClip {
      if (name === '_root' || name === '_level0') {
        return AVM1Context.instance.resolveLevel(0);
      } else if (name.indexOf('_level') === 0) {
        var level = name.substring(6), levelNum = level | 0;
        if (levelNum > 0 && level == levelNum) {
          return AVM1Context.instance.resolveLevel(levelNum)
        }
      }
      return null;
    }

    public asGetProperty(namespaces: Namespace [], name: any, flags: number) {
      if (_asHasProperty.call(this, namespaces, name, flags)) {
        return _asGetProperty.call(this, namespaces, name, flags);
      }
      if (typeof name === 'string' && name[0] === '_') {
        var level = this._resolveLevelNProperty(name);
        if (level) {
          return level;
        }
      }
      var resolved = resolveMultinameProperty(namespaces, name, flags);
      if (Multiname.isPublicQualifiedName(resolved) && this.isAVM1Instance) {
        return this.__lookupChild(Multiname.getNameFromPublicQualifiedName(resolved));
      }
      return undefined;
    }

    public asHasProperty(namespaces: Namespace [], name: any, flags: number) {
      if (_asHasProperty.call(this, namespaces, name, flags)) {
        return true;
      }
      if (typeof name === 'string' && name[0] === '_') {
        var level = this._resolveLevelNProperty(name);
        if (level) {
          return true;
        }
      }
      var resolved = resolveMultinameProperty(namespaces, name, flags);
      if (Multiname.isPublicQualifiedName(resolved) && this.isAVM1Instance) {
        return !!this.__lookupChild(Multiname.getNameFromPublicQualifiedName(resolved));
      }
      return false;
    }

    public asGetEnumerableKeys() {
      var keys = _asGetEnumerableKeys.call(this);
      // if it's a movie listing the children as well
      if (!this.isAVM1Instance) {
        return keys; // not initialized yet
      }

      var as3MovieClip = this.as3Object;
      for (var i = 0, length = as3MovieClip._children.length; i < length; i++) {
        var child = as3MovieClip._children[i];
        var name = child.name;
        if (!_asHasProperty.call(this, undefined, name, 0)) {
          keys.push(Multiname.getPublicQualifiedName(name));
        }
      }
      return keys;
    }

    addFrameActionBlocks(frameIndex: number, frameData: any) {
      var initActionBlocks: any[] = frameData.initActionBlocks;
      var actionBlocks: any[] = frameData.actionBlocks;

      if (initActionBlocks) {
        this._addInitActionBlocks(frameIndex, initActionBlocks);
      }

      if (actionBlocks) {
        for (var i = 0; i < actionBlocks.length; i++) {
          this.addFrameScript(frameIndex, actionBlocks[i]);
        }
      }
    }

    addFrameScript(frameIndex: number, actionsBlock: Uint8Array): void {
      var frameScripts = this._frameScripts;
      if (!frameScripts) {
        release || assert(!this._boundExecuteFrameScripts);
        this._boundExecuteFrameScripts = this._executeFrameScripts.bind(this);
        frameScripts = this._frameScripts = [];
      }
      var scripts: AVM1.AVM1ActionsData[] = frameScripts[frameIndex + 1];
      if (!scripts) {
        scripts = frameScripts[frameIndex + 1] = [];
        this.as3Object.addFrameScript(frameIndex, this._boundExecuteFrameScripts);
      }
      var actionsData = new AVM1.AVM1ActionsData(actionsBlock,
          'f' + frameIndex + 'i' + scripts.length);
      scripts.push(actionsData);
    }

    /**
     * AVM1 InitActionBlocks are executed once, before the children are initialized for a frame.
     * That matches AS3's enterFrame event, so we can add an event listener that just bails
     * as long as the target frame isn't reached, and executes the InitActionBlock once it is.
     *
     * After that, the listener removes itself.
     */
    private _addInitActionBlocks(frameIndex: number,
                                 actionsBlocks: {actionsData: Uint8Array} []): void
    {
      var avm2MovieClip = this.as3Object;
      var self = this;
      function listener (e) {
        if (avm2MovieClip.currentFrame !== frameIndex + 1) {
          return;
        }
        avm2MovieClip.removeEventListener('enterFrame', listener);

        var avm1Context = self.context;
        for (var i = 0; i < actionsBlocks.length; i++) {
          var actionsData = new AVM1.AVM1ActionsData(actionsBlocks[i].actionsData,
              'f' + frameIndex + 'i' + i);
          avm1Context.executeActions(actionsData, self);
        }
      }
      avm2MovieClip.addEventListener('enterFrame', listener);
    }

    private _executeFrameScripts() {
      var context = this.context;
      var scripts: AVM1.AVM1ActionsData[] = this._frameScripts[this.as3Object.currentFrame];
      release || assert(scripts && scripts.length);
      for (var i = 0; i < scripts.length; i++) {
        var actionsData = scripts[i];
        context.executeActions(actionsData, this);
      }
    }

    private static _initEventsHandlers(wrapped) {
      var prototype = wrapped.asGetPublicProperty('prototype');
      AVM1Utils.addEventHandlerProxy(prototype, 'onData', 'data');
      AVM1Utils.addEventHandlerProxy(prototype, 'onDragOut', 'dragOut');
      AVM1Utils.addEventHandlerProxy(prototype, 'onDragOver', 'dragOver');
      AVM1Utils.addEventHandlerProxy(prototype, 'onEnterFrame', 'enterFrame');
      AVM1Utils.addEventHandlerProxy(prototype, 'onKeyDown', 'keyDown');
      AVM1Utils.addEventHandlerProxy(prototype, 'onKeyUp', 'keyUp');
      AVM1Utils.addEventHandlerProxy(prototype, 'onKillFocus', 'focusOut', function (e) {
        return [e.relatedObject];
      });
      AVM1Utils.addEventHandlerProxy(prototype, 'onLoad', 'load');
      AVM1Utils.addEventHandlerProxy(prototype, 'onMouseDown', 'mouseDown');
      AVM1Utils.addEventHandlerProxy(prototype, 'onMouseUp', 'mouseUp');
      AVM1Utils.addEventHandlerProxy(prototype, 'onPress', 'mouseDown');
      AVM1Utils.addEventHandlerProxy(prototype, 'onRelease', 'mouseUp');
      AVM1Utils.addEventHandlerProxy(prototype, 'onReleaseOutside', 'releaseOutside');
      AVM1Utils.addEventHandlerProxy(prototype, 'onRollOut', 'mouseOut');
      AVM1Utils.addEventHandlerProxy(prototype, 'onRollOver', 'mouseOver');
      AVM1Utils.addEventHandlerProxy(prototype, 'onSetFocus', 'focusIn', function (e) {
        return [e.relatedObject];
      });
      AVM1Utils.addEventHandlerProxy(prototype, 'onUnload', 'unload');
    }
  }
}