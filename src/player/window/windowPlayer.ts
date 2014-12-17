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

module Shumway.Player.Window {
  import Player = Shumway.Player.Player;
  import DataBuffer = Shumway.ArrayUtilities.DataBuffer;

  import VideoControlEvent = Shumway.Remoting.VideoControlEvent;

  export class WindowPlayer extends Player {
    private _window;
    private _parent;

    constructor(window, parent?) {
      super();
      this._window = window;
      this._parent = parent || window.parent;
      this._window.addEventListener('message', function (e) {
        this.onWindowMessage(e.data, true);
      }.bind(this));
      this._window.addEventListener('syncmessage', function (e) {
        this.onWindowMessage(e.detail, false);
      }.bind(this));
    }

    onSendUpdates(updates: DataBuffer, assets: Array<DataBuffer>, async: boolean = true): DataBuffer {
      var bytes = updates.getBytes();
      var message = {
        type: 'player',
        updates: bytes,
        assets: assets,
        result: undefined
      };
      var transferList = [bytes.buffer];
      if (!async) {
        // TODO var result = this._parent.postSyncMessage(message, '*', transferList);
        var event = this._parent.document.createEvent('CustomEvent');
        event.initCustomEvent('syncmessage', false, false, message);
        this._parent.dispatchEvent(event);
        var result = message.result;
        return DataBuffer.FromPlainObject(result);
      }
      this._parent.postMessage(message, '*', transferList);
      return null;
    }

    onExternalCommand(command) {
      var event = this._parent.document.createEvent('CustomEvent');
      event.initCustomEvent('syncmessage', false, false, {
        type: 'external',
        request: command
      });
      this._parent.dispatchEvent(event);
    }

    onFSCommand(command: string, args: string) {
      this._parent.postMessage({
        type: 'fscommand',
        command: command,
        args: args
      }, '*');
    }

    onVideoControl(id: number, eventType: VideoControlEvent, data: any): any {
      var event = this._parent.document.createEvent('CustomEvent');
      event.initCustomEvent('syncmessage', false, false, {
        type: 'videoControl',
        id: id,
        eventType: eventType,
        data: data,
        result: undefined
      });
      this._parent.dispatchEvent(event);
      return event.detail.result;
    }

    onFrameProcessed() {
      this._parent.postMessage({
        type: 'frame'
      }, '*');
    }

    onRegisterFont(id: number, buffer: ArrayBuffer, forceFontInit: boolean) {
      this._parent.postMessage({
        type: 'font',
        id: id,
        buffer: buffer,
        forceFontInit: forceFontInit
      }, '*');
    }

    private onWindowMessage(data, async) {
      if (typeof data === 'object' && data !== null) {
        switch (data.type) {
          case 'gfx':
            var DataBuffer = Shumway.ArrayUtilities.DataBuffer;
            var updates = DataBuffer.FromArrayBuffer(data.updates.buffer);
            this.processUpdates(updates, data.assets);
            break;
          case 'externalCallback':
            this.processExternalCallback(data.request);
            break;
          case 'videoPlayback':
            this.processVideoEvent(data.id, data.eventType, data.data);
            break;
          case 'displayParameters':
            this.processDisplayParameters(data.params);
            break;
          case 'options':
            Shumway.Settings.setSettings(data.settings);
            break;
          case 'timeline':
            switch (data.request) {
              case 'AVM2':
                if (data.cmd === 'clear') {
                  Shumway.AVM2.timelineBuffer.reset();
                  break;
                }
                this._parent.postMessage({
                  type: 'timelineResponse',
                  request: data.request,
                  timeline: Shumway.AVM2.timelineBuffer
                }, '*');
                break;
              case 'Player':
                if (data.cmd === 'clear') {
                  Shumway.Player.timelineBuffer.reset();
                  break;
                }
                this._parent.postMessage({
                  type:'timelineResponse',
                  request: data.request,
                  timeline: Shumway.Player.timelineBuffer
                }, '*');
                break;
              case 'SWF':
                if (data.cmd === 'clear') {
                  Shumway.SWF.timelineBuffer.reset();
                  break;
                }
                this._parent.postMessage({
                  type:'timelineResponse',
                  request: data.request,
                  timeline: Shumway.SWF.timelineBuffer
                }, '*');
                break;
            }
            break;
        }
      }
    }
  }
}
