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
// Class: TextFormat
module Shumway.AVM2.AS.flash.text {
  import asCoerceString = Shumway.AVM2.Runtime.asCoerceString;
  import roundHalfEven = Shumway.NumberUtilities.roundHalfEven;
  import notImplemented = Shumway.Debug.notImplemented;
  import throwError = Shumway.AVM2.Runtime.throwError;

  export class TextFormat extends ASNative {

    static classInitializer: any = null;
    static initializer: any = null;
    static classSymbols: string [] = null; // [];
    static instanceSymbols: string [] = null; // [];

    constructor(font: string = null, size: Object = null, color: Object = null,
                bold: Object = null, italic: Object = null, underline: Object = null,
                url: string = null, target: string = null, align: string = null,
                leftMargin: Object = null, rightMargin: Object = null, indent: Object = null,
                leading: Object = null) {
      false && super();
      this.font = font;
      this.size = size;
      this.color = color;
      this.bold = bold;
      this.italic = italic;
      this.underline = underline;
      this.url = url;
      this.target = target;
      this.align = align;
      this.leftMargin = leftMargin;
      this.rightMargin = rightMargin;
      this.indent = indent;
      this.leading = leading;
    }

    private static measureTextField: flash.text.TextField;

    private _align: string;
    private _blockIndent: Object;
    private _bold: Object;
    private _bullet: Object;
    private _color: Object;
    private _display: string;
    private _font: string;
    private _indent: Object;
    private _italic: Object;
    private _kerning: Object;
    private _leading: Object;
    private _leftMargin: Object;
    private _letterSpacing: Object;
    private _rightMargin: Object;
    private _size: Object;
    private _tabStops: any [];
    private _target: string;
    private _underline: Object;
    private _url: string;

    // AS -> JS Bindings
    get align(): string {
      return this._align;
    }

    set align(value: string) {
      value = asCoerceString(value);
      //if (TextFormatAlign.toNumber(value) < 0) {
      //  throwError("ArgumentError", Errors.InvalidEnumError, "align");
      //}
      this._align = value;
    }

    get blockIndent(): Object {
      return this._blockIndent;
    }

    set blockIndent(value: Object) {
      this._blockIndent = TextFormat.coerceNumber(value);
    }

    get bold(): Object {
      return this._bold;
    }

    set bold(value: Object) {
      this._bold = TextFormat.coerceBoolean(value);
    }

    get bullet(): Object {
      return this._bullet;
    }

    set bullet(value: Object) {
      this._bullet = TextFormat.coerceBoolean(value);
    }

    get color(): Object {
      return this._color;
    }

    set color(value: Object) {
      this._color = +value | 0;
    }

    get display(): string {
      return this._display;
    }

    set display(value: string) {
      this._display = asCoerceString(value);
    }

    get font(): string {
      return this._font;
    }

    set font(value: string) {
      this._font = asCoerceString(value);
    }

    get indent(): Object {
      return this._indent;
    }

    set indent(value: Object) {
      this._indent = TextFormat.coerceNumber(value);
    }

    get italic(): Object {
      return this._italic;
    }

    set italic(value: Object) {
      this._italic = TextFormat.coerceBoolean(value);
    }

    get kerning(): Object {
      return this._kerning;
    }

    set kerning(value: Object) {
      this._kerning = TextFormat.coerceBoolean(value);
    }

    get leading(): Object {
      return this._leading;
    }

    set leading(value: Object) {
      this._leading = TextFormat.coerceNumber(value);
    }

    get leftMargin(): Object {
      return this._leftMargin;
    }

    set leftMargin(value: Object) {
      this._leftMargin = TextFormat.coerceNumber(value);
    }

    get letterSpacing(): Object {
      return this._letterSpacing;
    }

    set letterSpacing(value: Object) {
      this._letterSpacing = TextFormat.coerceBoolean(value);
    }

    get rightMargin(): Object {
      return this._rightMargin;
    }

    set rightMargin(value: Object) {
      this._rightMargin = TextFormat.coerceNumber(value);
    }

    get size(): Object {
      return this._size;
    }

    set size(value: Object) {
      this._size = TextFormat.coerceNumber(value);
    }

    get tabStops(): any [] {
      return this._tabStops;
    }

    set tabStops(value: any []) {
      if (!(value instanceof Array)) {
        throwError("ArgumentError", Errors.CheckTypeFailedError, value, 'Array');
      }
      this._tabStops = value;
    }

    get target(): string {
      return this._target;
    }

    set target(value: string) {
      this._target = asCoerceString(value);
    }

    get underline(): Object {
      return this._underline;
    }

    set underline(value: Object) {
      this._underline = TextFormat.coerceBoolean(value);
    }

    get url(): string {
      return this._url;
    }

    set url(value: string) {
      this._url = asCoerceString(value);
    }

    /**
     * All integer values on TextFormat are typed as Object and coerced to ints using the following
     * "algorithm":
     * - if the supplied value is null or undefined, the field is set to null
     * - else if coercing to number results in NaN or the value is greater than MAX_INT, set to
     *   -0x80000000
     * - else, round the coerced value using half-even rounding
     */
    private static coerceNumber(value: any): any {
      /* tslint:disable */
      if (value == undefined) {
        return null;
      }
      /* tslint:enable */
      if (isNaN(value) || value > 0xfffffff) {
        return -0x80000000;
      }
      return roundHalfEven(value);
    }

    /**
     * Boolean values are only stored as bools if they're not undefined or null. In that case,
     * they're stored as null.
     */
    private static coerceBoolean(value: any): any {
      /* tslint:disable */
      return value == undefined ? null : !!value;
      /* tslint:enable */
    }

    clone(): TextFormat {
      return new flash.text.TextFormat(
        this.font,
        this.size,
        this.color,
        this.bold,
        this.italic,
        this.underline,
        this.url,
        this.target,
        this.align,
        this.leftMargin,
        this.rightMargin,
        this.indent,
        this.leading
      );
    }

    public equals(other: TextFormat): boolean {
      return this._align === other._align &&
             this._blockIndent === other._blockIndent &&
             this._bold === other._bold &&
             this._bullet === other._bullet &&
             this._color === other._color &&
             this._display === other._display &&
             this._font === other._font &&
             this._indent === other._indent &&
             this._italic === other._italic &&
             this._kerning === other._kerning &&
             this._leading === other._leading &&
             this._leftMargin === other._leftMargin &&
             this._letterSpacing === other._letterSpacing &&
             this._rightMargin === other._rightMargin &&
             this._size === other._size &&
             this._tabStops === other._tabStops &&
             this._target === other._target &&
             this._underline === other._underline &&
             this._url === other._url;
    }

    public merge(other: TextFormat) {
      if (other._align !== null) {
        this._align = other._align;
      }
      if (other._blockIndent !== null) {
        this._blockIndent = other._blockIndent;
      }
      if (other._bold !== null) {
        this._bold = other._bold;
      }
      if (other._bullet !== null) {
        this._bullet = other._bullet;
      }
      if (other._color !== null) {
        this._color = other._color;
      }
      if (other._display !== null) {
        this._display = other._display;
      }
      if (other._font) {
        this._font = other._font;
      }
      if (other._indent !== null) {
        this._indent = other._indent;
      }
      if (other._italic !== null) {
        this._italic = other._italic;
      }
      if (other._kerning !== null) {
        this._kerning = other._kerning;
      }
      if (other._leading !== null) {
        this._leading = other._leading;
      }
      if (other._leftMargin !== null) {
        this._leftMargin = other._leftMargin;
      }
      if (other._letterSpacing !== null) {
        this._letterSpacing = other._letterSpacing;
      }
      if (other._rightMargin !== null) {
        this._rightMargin = other._rightMargin;
      }
      if (other._size !== null) {
        this._size = other._size;
      }
      if (other._tabStops !== null) {
        this._tabStops = other._tabStops;
      }
      if (other._target) {
        this._target = other._target;
      }
      if (other._underline !== null) {
        this._underline = other._underline;
      }
      if (other._url) {
        this._url = other._url;
      }
    }

    public intersect(other: TextFormat) {
      if (other._align !== this._align) {
        this._align = null;
      }
      if (other._blockIndent !== this._blockIndent) {
        this._blockIndent = null;
      }
      if (other._bold !== this._bold) {
        this._bold = null;
      }
      if (other._bullet !== this._bullet) {
        this._bullet = null;
      }
      if (other._color !== this._color) {
        this._color = null;
      }
      if (other._display !== this._display) {
        this._display = null;
      }
      if (other._font !== this._font) {
        this._font = null;
      }
      if (other._indent !== this._indent) {
        this._indent = null;
      }
      if (other._italic !== this._italic) {
        this._italic = null;
      }
      if (other._kerning !== this._kerning) {
        this._kerning = null;
      }
      if (other._leading !== this._leading) {
        this._leading = null;
      }
      if (other._leftMargin !== this._leftMargin) {
        this._leftMargin = null;
      }
      if (other._letterSpacing !== this._letterSpacing) {
        this._letterSpacing = null;
      }
      if (other._rightMargin !== this._rightMargin) {
        this._rightMargin = null;
      }
      if (other._size !== this._size) {
        this._size = null;
      }
      if (other._tabStops !== this._tabStops) {
        this._tabStops = null;
      }
      if (other._target !== this._target) {
        this._target = null;
      }
      if (other._underline !== this._underline) {
        this._underline = null;
      }
      if (other._url !== this._url) {
        this._url = null;
      }
    }
  }
}
