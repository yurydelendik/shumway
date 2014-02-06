package flash.display {
  import flash.events.EventDispatcher;
  import String;
  import Boolean;
  import flash.display.DisplayObject;
  import uint;
  import Number;
  import flash.system.ApplicationDomain;
  import flash.events.UncaughtErrorEvents;
  import int;
  import flash.events.Event;
  import flash.utils.ByteArray;
  import Object;
  import flash.display.Loader;
  import flash.events.ProgressEvent;
  import flash.errors.IllegalOperationError;
  import Error;
  import flash.events.HTTPStatusEvent;
  import flash.events.UncaughtErrorEvents;
  import flash.events.Event;
  import flash.events.IOErrorEvent;
  public class LoaderInfo extends EventDispatcher {
    public function LoaderInfo() {}
    public static native function getLoaderInfoByDefinition(object:Object):LoaderInfo;
    public native function get loaderURL():String;
    public native function get url():String;
    public native function get isURLInaccessible():Boolean;
    public native function get bytesLoaded():uint;
    public native function get bytesTotal():uint;
    public native function get applicationDomain():ApplicationDomain;
    public native function get swfVersion():uint;
    public native function get actionScriptVersion():uint;
    public native function get frameRate():Number;
    public function get parameters():Object { notImplemented("parameters"); }
    public native function get width():int;
    public native function get height():int;
    public native function get contentType():String;
    public native function get sharedEvents():EventDispatcher;
    public native function get parentSandboxBridge():Object;
    public native function set parentSandboxBridge(door:Object):void;
    public native function get childSandboxBridge():Object;
    public native function set childSandboxBridge(door:Object):void;
    public override function dispatchEvent(event:Event):Boolean { notImplemented("dispatchEvent"); }
    public native function get sameDomain():Boolean;
    public native function get childAllowsParent():Boolean;
    public native function get parentAllowsChild():Boolean;
    public native function get loader():Loader;
    public native function get content():DisplayObject;
    public native function get bytes():ByteArray;
    public function get uncaughtErrorEvents():UncaughtErrorEvents { notImplemented("uncaughtErrorEvents"); }
  }
}
