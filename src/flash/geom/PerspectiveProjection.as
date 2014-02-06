package flash.geom {
  import Object;
  import flash.geom.Matrix3D;
  import flash.geom.Point;
  public class PerspectiveProjection {
    public function PerspectiveProjection() {}
    public native function get fieldOfView():Number;
    public native function set fieldOfView(fieldOfViewAngleInDegrees:Number):void;
    public native function get projectionCenter():Point;
    public native function set projectionCenter(p:Point);
    public native function get focalLength():Number;
    public native function set focalLength(value:Number):void;
    public native function toMatrix3D():Matrix3D;
  }
}
