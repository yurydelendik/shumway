package flash.text.ime {
  import Object;
  import __AS3__.vec.Vector;
  import flash.geom.Rectangle;
  import flash.text.ime.CompositionAttributeRange;
  import flash.events.IMEEvent;
  import flash.events.TextEvent;
  public interface IIMEClient {
     function updateComposition(text:String, attributes:Vector, compositionStartIndex:int, compositionEndIndex:int):void;
     function confirmComposition(text:String = null, preserveSelection:Boolean = false):void;
     function getTextBounds(startIndex:int, endIndex:int):Rectangle;
     function get compositionStartIndex():int;
     function get compositionEndIndex():int;
     function get verticalTextLayout():Boolean;
     function get selectionAnchorIndex():int;
     function get selectionActiveIndex():int;
     function selectRange(anchorIndex:int, activeIndex:int):void;
     function getTextInRange(startIndex:int, endIndex:int):String;
  }
}
