package flash.display3D {
  import Object;
  import flash.utils.ByteArray;
  public final class Program3D {
    public function Program3D() {}
    public native function upload(vertexProgram:ByteArray, fragmentProgram:ByteArray):void;
    public native function dispose():void;
  }
}
