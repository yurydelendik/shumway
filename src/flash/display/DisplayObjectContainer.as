package flash.display {
  import flash.display.InteractiveObject;
  import String;
  import Array;
  import Boolean;
  import flash.display.DisplayObject;
  import flash.geom.Point;
  import int;
  import flash.text.TextSnapshot;
  public class DisplayObjectContainer extends InteractiveObject {
    public function DisplayObjectContainer() {}
    public native function addChild(child:DisplayObject):DisplayObject;
    public native function addChildAt(child:DisplayObject, index:int):DisplayObject;
    public native function removeChild(child:DisplayObject):DisplayObject;
    public native function removeChildAt(index:int):DisplayObject;
    public native function getChildIndex(child:DisplayObject):int;
    public native function setChildIndex(child:DisplayObject, index:int):void;
    public native function getChildAt(index:int):DisplayObject;
    public native function getChildByName(name:String):DisplayObject;
    public native function get numChildren():int;
    public native function get textSnapshot():TextSnapshot;
    public native function getObjectsUnderPoint(point:Point):Array;
    public native function areInaccessibleObjectsUnderPoint(point:Point):Boolean;
    public native function get tabChildren():Boolean;
    public native function set tabChildren(enable:Boolean):void;
    public native function get mouseChildren():Boolean;
    public native function set mouseChildren(enable:Boolean):void;
    public native function contains(child:DisplayObject):Boolean;
    public native function swapChildrenAt(index1:int, index2:int):void;
    public native function swapChildren(child1:DisplayObject, child2:DisplayObject):void;
    public native function removeChildren(beginIndex:int = 0, endIndex:int = 2147483647):void;
  }
}
