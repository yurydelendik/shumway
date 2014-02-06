package flash.system {
  import flash.events.EventDispatcher;
  import Object;
  import flash.system.MessageChannel;
  import flash.utils.ByteArray;
  import flash.events.Event;
  public final class Worker extends EventDispatcher {
    public function Worker() {}
    public static native function get isSupported():Boolean;
    public static function get current():Worker { notImplemented("current"); }
    public native function createMessageChannel(receiver:Worker):MessageChannel;
    public function start():void { notImplemented("start"); }
    public function setSharedProperty(key:String, value):void { notImplemented("setSharedProperty"); }
    public function getSharedProperty(key:String) { notImplemented("getSharedProperty"); }
    public native function get isPrimordial():Boolean;
    public function get state():String { notImplemented("state"); }
    public override function addEventListener(type:String, listener:Function, useCapture:Boolean = false, priority:int = 0, useWeakReference:Boolean = false):void { notImplemented("addEventListener"); }
    public override function removeEventListener(type:String, listener:Function, useCapture:Boolean = false):void { notImplemented("removeEventListener"); }
    public native function terminate():Boolean;
  }
}
