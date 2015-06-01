package org.mozilla.vp6player {
  import flash.display.MovieClip;
  import flash.display.LoaderInfo;
  import flash.external.ExternalInterface;
  import flash.media.Video;
  import flash.net.NetConnection;
  import flash.net.NetStream;
  import flash.events.NetStatusEvent;
  import flash.events.SecurityErrorEvent;
  import flash.events.AsyncErrorEvent;
  import flash.system.Security;


	public class VP6Player extends MovieClip {
    private var _video:Video;

    private var _connection:NetConnection;
    private var _stream:NetStream;
    private var _mediaUrl:String;
    private var _duration:Number;
    private var _volume:Number;
    private var _id:String;

		public function VP6Player() {
      _video = new Video();
      addChild(_video);

      var params:Object = loaderInfo.parameters;
      _id = params['id'];
      initExternalMethods();

      ExternalInterface.call('Shumway.GFX.VP6Player.__init', _id);
      _volume = 1.0;
      syncProperties({paused: true, volume: _volume});
		}

    private function initExternalMethods():void {
      Security.allowDomain('*'); // Flash has file:/// origin -- allowing resource:// access us.
      ExternalInterface.addCallback('setProperty', this._setProperty);
      ExternalInterface.addCallback('play', this._play);
      ExternalInterface.addCallback('pause', this._pause);
      ExternalInterface.addCallback('getTime', this._getTime);
      ExternalInterface.addCallback('setTime', this._setTime);
      ExternalInterface.addCallback('getBufferedTime', this._getBufferedTime);
    }

    private function _setProperty(propertyName:String, value:*):void {
      switch (propertyName) {
        case 'src':
          if (this._mediaUrl != value) {
            this._mediaUrl = value;
            this._connection = null;
          }
          break;
        case 'volume':
          _volume = value;
          if (!_stream) {
            break;
          }
          var soundTransform = _stream.soundTransform;
          soundTransform.volume = value;
          _stream.soundTransform = soundTransform;
          break;
      }
    }

    private function _getTime():Number {
      return _stream.time;
    }

    private function _setTime(offset:Number):void {
      _stream.seek(offset);
    }

    private function _getBufferedTime():Number {
      return _stream.bytesLoaded / _stream.bytesTotal * _duration;
    }

    private function netStatusHandler(event:NetStatusEvent):void {
      switch (event.info.code) {
        case "NetConnection.Connect.Success":
          connectStream();
          break;
        case "NetStream.Play.Start":
          syncProperties({paused: false});
          dispatchPlayerEvent('loadeddata');
          break;
        case "NetStream.Play.Stop":
          dispatchPlayerEvent('ended');
          break;
        case "NetStream.Buffer.Full":
          dispatchPlayerEvent('canplay');
          break;
        case "NetStream.Buffer.Empty":
          //TODO
          break;
        case "NetStream.Pause.Notify":
          syncProperties({paused: true});
          dispatchPlayerEvent('pause');
          break;
        case "NetStream.Unpause.Notify":
          syncProperties({paused: false});
          dispatchPlayerEvent('play');
          break;
        case "NetStream.Seek.Notify":
          dispatchPlayerEvent('seeking');
          break;
        case "NetStream.Seek.Complete":
          dispatchPlayerEvent('seeked');
          break;
        case "NetStream.Play.NoSupportedTrackFound":
          syncProperties({errorCode: 4});
          dispatchPlayerEvent('error');
          break;
        case "NetStream.Play.FileStructureInvalid":
          syncProperties({errorCode: 3});
          dispatchPlayerEvent('error');
          break;
        case "NetStream.Play.StreamNotFound":
          syncProperties({errorCode: 2});
          dispatchPlayerEvent('error');
          break;
      }
    }

    private function securityErrorHandler(event:SecurityErrorEvent):void {
      trace("securityErrorHandler: " + event);
    }

    private function asyncErrorHandler(event:AsyncErrorEvent):void {
      // ignore AsyncErrorEvent events.
    }

    private function connectStream() {
      _stream = new NetStream(_connection);
      _stream.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
      _stream.addEventListener(AsyncErrorEvent.ASYNC_ERROR, asyncErrorHandler);
      _stream.client = {
        onMetaData: this.onMetaData
      };
      _duration = NaN;
      var soundTransform = _stream.soundTransform;
      soundTransform.volume = _volume;
      _stream.soundTransform = soundTransform;

      _video.attachNetStream(_stream);
      _stream.play(_mediaUrl);
    }

    private function onMetaData(metadata:*) {
      syncProperties({
        videoWidth: metadata.width,
        videoHeight: metadata.height,
        duration: metadata.duration
      });
      _duration = metadata.duration;
      ExternalInterface.call('Shumway.GFX.VP6Player.__setSize', _id,  metadata.width,  metadata.height);
      dispatchPlayerEvent('loadedmetadata');
    }

    private function _play():void {
      if (!_connection) {
        _connection = new NetConnection();
        _connection.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
        _connection.addEventListener(SecurityErrorEvent.SECURITY_ERROR, securityErrorHandler);
        _connection.connect(null);
        return;
      }

      _stream.resume();
    }

    private function _pause():void {
      _stream.pause();
    }

    private function syncProperties(props:*):void {
      ExternalInterface.call('Shumway.GFX.VP6Player.__syncProperties', _id, props);
    }

    private function dispatchPlayerEvent(eventName:String):void {
      ExternalInterface.call('Shumway.GFX.VP6Player.__dispatchEvent', _id, eventName);
    }
	}
}
