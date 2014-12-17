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

module Shumway.Player.Test {
  import Player = Shumway.Player.Player;
  import DataBuffer = Shumway.ArrayUtilities.DataBuffer;

  import VideoControlEvent = Shumway.Remoting.VideoControlEvent;

  export class TestPlayer extends Player {
    private _worker;

    constructor() {
      super();

      // TODO this is temporary worker to test postMessage tranfers
      this._worker = Shumway.Player.Test.FakeSyncWorker.instance;
      this._worker.addEventListener('message', this._onWorkerMessage.bind(this));
      this._worker.addEventListener('syncmessage', this._onSyncWorkerMessage.bind(this));
    }

    public onSendUpdates(updates: DataBuffer, assets: Array<DataBuffer>, async: boolean = true): DataBuffer {
      var bytes = updates.getBytes();
      var message = {
        type: 'player',
        updates: bytes,
        assets: assets
      };
      var transferList = [bytes.buffer];
      if (!async) {
        var result = this._worker.postSyncMessage(message, transferList);
        return DataBuffer.FromPlainObject(result);
      }
      this._worker.postMessage(message, transferList);
      return null;
    }

    onExternalCommand(command) {
      this._worker.postSyncMessage({
        type: 'external',
        command: command
      });
    }

    onFSCommand(command: string, args: string) {
      this._worker.postMessage({
        type: 'fscommand',
        command: command,
        args: args
      });
    }

    onVideoControl(id: number, eventType: VideoControlEvent, data: any): any {
      return this._worker.postSyncMessage({
        type: 'videoControl',
        id: id,
        eventType: eventType,
        data: data
      });
    }

    onFrameProcessed() {
      this._worker.postMessage({
        type: 'frame'
      });
    }

    onRegisterFont(id: number, buffer: ArrayBuffer, forceFontInit: boolean) {
      this._worker.postMessage({
        type: 'font',
        id: id,
        buffer: buffer,
        forceFontInit: forceFontInit
      });
    }

    private _onWorkerMessage(e) {
      var data = e.data;
      if (typeof data !== 'object' || data === null) {
        return;
      }
      switch (data.type) {
        case 'gfx':
          var updates = DataBuffer.FromArrayBuffer(e.data.updates.buffer);
          this.processUpdates(updates, e.data.assets);
          break;
        case 'externalCallback':
          this.processExternalCallback(data.request);
          e.handled = true;
          return;
        case 'videoPlayback':
          this.processVideoEvent(data.id, data.eventType, data.data);
          return;
        case 'displayParameters':
          this.processDisplayParameters(data.params);
          break;
      }
    }

    private _onSyncWorkerMessage(e) {
      return this._onWorkerMessage(e);
    }
  }
}
