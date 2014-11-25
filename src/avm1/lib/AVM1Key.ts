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

///<reference path='../references.ts' />

module Shumway.AVM1.Lib {
  import flash = Shumway.AVM2.AS.flash;
  import assert = Shumway.Debug.assert;

  export class AVM1Key {
    public static DOWN: number = 40;
    public static LEFT: number = 37;
    public static RIGHT: number = 39;
    public static UP: number = 38;

    private static _keyStates: any[] = [];
    private static _lastKeyCode: number = 0;

    public static createAVM1Class(): typeof AVM1Key {
      var wrapped = wrapAVM1Class(AVM1Key,
        ['DOWN', 'LEFT', 'RIGHT', 'UP', 'isDown'],
        []);
      AVM1Broadcaster.initialize(wrapped);
      return wrapped;
    }

    public static _bind(stage: flash.display.Stage, context: AVM1Context) {
      stage.addEventListener('keyDown', function (e: flash.events.KeyboardEvent) {
        var keyCode = e.asGetPublicProperty('keyCode');
        AVM1Key._lastKeyCode = keyCode;
        AVM1Key._keyStates[keyCode] = 1;
        context.globals.Key.asCallPublicProperty('broadcastMessage', ['onKeyDown']);
      }, false);

      stage.addEventListener('keyUp', function (e: flash.events.KeyboardEvent) {
        var keyCode = e.asGetPublicProperty('keyCode');
        AVM1Key._lastKeyCode = keyCode;
        delete AVM1Key._keyStates[keyCode];
        context.globals.Key.asCallPublicProperty('broadcastMessage', ['onKeyUp']);
      }, false);
    }

    public static isDown(code) {
      return !!AVM1Key._keyStates[code];
    }

  }
}