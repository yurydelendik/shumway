package flash.display {
  import flash.display.DisplayObjectContainer;
  import flash.geom.Rectangle;
  import Boolean;
  import flash.display.DisplayObject;
  import int;
  import flash.display.Graphics;
  import flash.media.SoundTransform;
  public class Sprite extends DisplayObjectContainer {
    public function Sprite() {}
    public native function get graphics():Graphics;
    public native function get buttonMode():Boolean;
    public native function set buttonMode(value:Boolean):void;
    public native function startDrag(lockCenter:Boolean = false, bounds:Rectangle = null):void;
    public native function stopDrag():void;
    public native function startTouchDrag(touchPointID:int, lockCenter:Boolean = false, bounds:Rectangle = null):void;
    public native function stopTouchDrag(touchPointID:int):void;
    public native function get dropTarget():DisplayObject;
    public native function get hitArea():Sprite;
    public native function set hitArea(value:Sprite):void;
    public native function get useHandCursor():Boolean;
    public native function set useHandCursor(value:Boolean):void;
    public native function get soundTransform():SoundTransform;
    public native function set soundTransform(sndTransform:SoundTransform):void;
  }
}
