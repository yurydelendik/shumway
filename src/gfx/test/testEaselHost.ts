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

declare module Shumway.Player.Test {
  class FakeSyncWorker {
    static instance: FakeSyncWorker;

    addEventListener(type: string, listener: any, useCapture?: boolean): void;
    removeEventListener(type: string, listener: any, useCapture?: boolean): void;
    postMessage(message: any, ports?: any): void;
    postSyncMessage(message: any, ports?: any): any;
  }
}

module Shumway.GFX.Test {
  import Easel = Shumway.GFX.Easel;
  import DataBuffer = Shumway.ArrayUtilities.DataBuffer;

  import CircularBuffer = Shumway.CircularBuffer;
  import TimelineBuffer = Shumway.Tools.Profiler.TimelineBuffer;

  import VideoPlaybackEvent = Shumway.Remoting.VideoPlaybackEvent;
  import DisplayParameters = Shumway.Remoting.DisplayParameters;

  export class TestEaselHost extends EaselHost {
    private _worker;

    public constructor(easel: Easel) {
      super(easel);

      // TODO this is temporary worker to test postMessage tranfers
      this._worker = Shumway.Player.Test.FakeSyncWorker.instance;
      this._worker.addEventListener('message', this._onWorkerMessage.bind(this));
      this._worker.addEventListener('syncmessage', this._onSyncWorkerMessage.bind(this));
    }

    onSendUpdates(updates: DataBuffer, assets: Array<DataBuffer>) {
      var bytes = updates.getBytes();
      this._worker.postMessage({
        type: 'gfx',
        updates: bytes,
        assets: assets
      }, [bytes.buffer]);
    }

    onExernalCallback(request) {
      this._worker.postSyncMessage({
        type: 'externalCallback',
        request: request
      });
    }

    onDisplayParameters(params: DisplayParameters) {
      this._worker.postMessage({
        type: 'displayParameters',
        params: params
      });
    }

    onVideoPlaybackEvent(id: number, eventType: VideoPlaybackEvent, data: any) {
      this._worker.postMessage({
        type: 'videoPlayback',
        id: id,
        eventType: eventType,
        data: data
      });
    }

    requestTimeline(type: string, cmd: string): Promise<TimelineBuffer> {
      var buffer: TimelineBuffer;
      switch (type) {
        case 'AVM2':
          buffer = (<any>Shumway).AVM2.timelineBuffer;
          break;
        case 'Player':
          buffer = (<any>Shumway).Player.timelineBuffer;
          break;
        case 'SWF':
          buffer = (<any>Shumway).SWF.timelineBuffer;
          break;
      }
      if (cmd === 'clear' && buffer) {
        buffer.reset();
      }
      return Promise.resolve(buffer);
    }

    private _onWorkerMessage(e, async: boolean = true): any {
      var data = e.data;
      if (typeof data !== 'object' || data === null) {
        return;
      }
      var type = data.type;
      switch (type) {
        case 'player':
          var updates = DataBuffer.FromArrayBuffer(data.updates.buffer);
          if (async) {
            this.processUpdates(updates, data.assets);
          } else {
            var output = new DataBuffer();
            this.processUpdates(updates, data.assets, output);
            e.result = output.toPlainObject();
            e.handled = true;
          }
          break;
        case 'frame':
          this.processFrame();
          break;
        case 'external':
          e.result = this.processExternalCommand(data.command);
          e.handled = true;
          break;
        case 'videoControl':
          e.result = this.processVideoControl(data.id, data.eventType, data.data);
          e.handled = true;
          break;
        case 'fscommand':
          this.processFSCommand(data.command, data.args);
          break;
        case 'font':
          this.processRegisterFont(data.id, data.buffer, data.forceFontInit);
          e.handled = true;
          break;
      }
    }

    private _onSyncWorkerMessage(e): any {
      return this._onWorkerMessage(e, false);
    }
  }
}
