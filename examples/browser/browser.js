function clear() {
  document.getElementById("content").setAttribute("hidden", "hidden");
  document.getElementById("frames").textContent = '';
  document.getElementById("dictionary").textContent = '';
}

function showHeader(header, fileSize) {
  document.getElementById("signature").textContent =
    String.fromCharCode.apply(null, header.subarray(0, 3));
  document.getElementById("version").textContent = header[3];
  document.getElementById("length").textContent =
    ((header[7] << 24) | (header[6] << 16) | (header[5] << 8) | header[4]) >>> 0 +
    ' (file: ' + fileSize + ')';
}

function addExpandButton(container, onChange) {
  var button = document.createElement('button');
  var collapsed = true;
  var updateState = function () {
    if (collapsed) {
      button.textContent = '+';
      button.className = 'expandButton closedButton';
    } else {
      button.textContent = '-';
      button.className = 'expandButton openButton';
    }
  };
  button.onclick = function () {
    collapsed = !collapsed;
    onChange(collapsed);
    updateState();
  };
  updateState();
  container.appendChild(button);
}

function renderControlTag(controlTagDiv, controlTag) {
  var controlTagBody;
  addExpandButton(controlTagDiv, function (collapsed) {
    if (collapsed) {
      controlTagDiv.removeChild(controlTagBody);
      controlTagBody = null;
      return;
    }
    controlTagBody = document.createElement('pre');
    controlTagBody.textContent = JSON.stringify(parsedTag, null, 2);
    controlTagDiv.appendChild(controlTagBody);
  });

  var parsedTag = controlTag.tagCode === undefined ?
    controlTag : swfFile.getParsedTag(controlTag);

  var controlTagHeader = document.createElement('div');
  controlTagHeader.className = 'title';
  controlTagHeader.textContent = Shumway.SWF.Parser.getSwfTagCodeName(controlTag.tagCode) +
    (parsedTag.symbolId !== undefined ? ', Symbol ' + parsedTag.symbolId : '') +
    (parsedTag.depth !== undefined ? ', Depth ' + parsedTag.depth : '');
  controlTagDiv.appendChild(controlTagHeader);
}

function renderFrameChildren(frameChildrenDiv, controlTags) {
  if (controlTags) {
    for (var i = 0; i < controlTags.length; i++) {
      var controlTagDiv = document.createElement('div');
      controlTagDiv.className = 'swfcontroltag';
      renderControlTag(controlTagDiv, controlTags[i]);
      frameChildrenDiv.appendChild(controlTagDiv);
    }
  }
}

function renderFrame(frameContainer, frame, index) {
  var childrenDiv = null;
  addExpandButton(frameContainer, function (collapsed) {
    if (collapsed) {
      frameContainer.removeChild(childrenDiv);
      childrenDiv = null;
      return;
    }
    childrenDiv = document.createElement('div');
    childrenDiv.className = 'swfframechildren';
    renderFrameChildren(childrenDiv, frame.controlTags);
    frameContainer.appendChild(childrenDiv);
  });
  var frameTitleDiv = document.createElement('div');
  frameTitleDiv.className = 'title';
  frameTitleDiv.textContent = 'Frame ' + index;
  frameContainer.appendChild(frameTitleDiv);
}

function renderFrames(framesContainer, frames) {
  for (var i = 0; i < frames.length; i++) {
    var frameDiv = document.createElement('div');
    frameDiv.className = 'swfframe';
    renderFrame(frameDiv, frames[i], i + 1);
    framesContainer.appendChild(frameDiv);
  }
}

function showImage(container, imageDefinition) {
  switch (imageDefinition.dataType) {
    case Shumway.ImageType.None:
      return;
    case Shumway.ImageType.GIF:
    case Shumway.ImageType.JPEG:
    case Shumway.ImageType.PNG:
      var img = document.createElement('img');
      img.src = URL.createObjectURL(new Blob([imageDefinition.data], {type: imageDefinition.mimeType}));
      if (imageDefinition.alphaData) {
        img.onload = function() {
          var canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          var imageData = ctx.getImageData(0, 0, img.width, img.height);
          for (var i = 3, j = 0; j < imageDefinition.alphaData.length; i += 4, j++) {
            imageData.data[i] = imageDefinition.alphaData[j];
          }
          ctx.putImageData(imageData, 0, 0);
          container.appendChild(canvas);
        };
      } else {
        container.appendChild(img);
      }
      return;
  }
  var canvas = document.createElement('canvas');
  canvas.width = imageDefinition.width;
  canvas.height = imageDefinition.height;
  var ctx = canvas.getContext('2d');
  var imageData = ctx.createImageData(canvas.width, canvas.height);
  Shumway.ColorUtilities.convertImage(imageDefinition.dataType,
    Shumway.ImageType.StraightAlphaRGBA,
    new Int32Array(imageDefinition.data.buffer),
    new Int32Array(imageData.data.buffer));
  ctx.putImageData(imageData, 0, 0);
  container.appendChild(canvas);
}

function renderSymbolContent(childrenDiv, symbol) {
  switch (symbol.type) {
    case 'sprite':
      var framesDiv = document.createElement('div');
      renderFrames(framesDiv, symbol.frames);
      childrenDiv.appendChild(framesDiv);
      break;
    case 'button':
      for (var state in symbol.states) {
        var stateDiv = document.createElement('div');
        var stateDivTitle = document.createElement('div');
        stateDivTitle.className = 'title';
        stateDivTitle.textContent = state;
        stateDiv.appendChild(stateDivTitle);
        renderFrameChildren(stateDiv, symbol.states[state]);
        childrenDiv.appendChild(stateDiv);
      }
      break;
    case 'image':
      var imageTitleDiv = document.createElement('div');
      imageTitleDiv.textContent =
        'Width: ' + symbol.definition.width + '; ' +
        'Height: ' + symbol.definition.height + '; ' +
        'Type: ' + (Shumway.ImageType[symbol.definition.dataType]) + '; ' +
        (symbol.definition.alphaData ? 'Has alpha; ' : '') +
        'Mime: ' + symbol.definition.mimeType;
      childrenDiv.appendChild(imageTitleDiv);
      showImage(childrenDiv, symbol.definition);
      break;
    case 'font':
      var fontTitleDiv = document.createElement('div');
      fontTitleDiv.className = 'title';
      fontTitleDiv.textContent = symbol.name +
        (symbol.bold ? ' (bold)' : '') + (symbol.italic ? ' (italic)': '') ;
      childrenDiv.appendChild(fontTitleDiv);
      var fontDownload = document.createElement('a');
      fontDownload.href = URL.createObjectURL(new Blob([symbol.data], {type: 'font/truetype'}));
      fontDownload.textContent = 'download';
      childrenDiv.appendChild(fontDownload);
      break;
    case 'text':
      var textContentDiv = document.createElement('pre');
      textContentDiv.textContent = symbol.tag.initialText;
      childrenDiv.appendChild(textContentDiv);

      var textTitleDiv = document.createElement('div');
      textTitleDiv.className = 'title';
      textTitleDiv.textContent =
        'Font ' + symbol.tag.fontId + '; ' +
        'Height: '  + symbol.tag.fontHeight + '; ' +
        (symbol.variableName ? 'Var: ' + symbol.variableName + '; ' : '');
      childrenDiv.appendChild(textTitleDiv);
      break;
    case 'label':
      for (var i = 0; i < symbol.records.length; i++) {
        var record = symbol.records[i];
        var font = swfFile.dictionary[record.fontId];
        var s = '???';
        if (font && (font.tagCode === undefined || (font = swfFile.getParsedTag(font)))) {
          s = record.entries.map(function (item) {
            return String.fromCharCode(font.codes[item.glyphIndex]);
          }).join('');
        }

        var textTitleDiv = document.createElement('div');
        textTitleDiv.className = 'title';
        textTitleDiv.textContent =
          'Font ' + record.fontId + '; ' +
          'Height: '  + record.fontHeight + '; ' +
          'Glyphs: ' + s;
        childrenDiv.appendChild(textTitleDiv);
      }
      break;

    case 'shape':
    default:
      debugger;
      childrenDiv.textContent = JSON.stringify(symbol);
      break;
  }
}

function renderSymbol(symbolContainer, symbol, index) {
  var childrenDiv = null;
  addExpandButton(symbolContainer, function (collapsed) {
    if (collapsed) {
      symbolContainer.removeChild(childrenDiv);
      childrenDiv = null;
      return;
    }
    childrenDiv = document.createElement('div');
    childrenDiv.className = 'swfsymbolchildren';
    renderSymbolContent(childrenDiv, symbol);
    symbolContainer.appendChild(childrenDiv);
  });
  var symbolTitleDiv = document.createElement('div');
  symbolTitleDiv.className = 'title';
  symbolTitleDiv.textContent = 'Symbol ' + index + ' (' + symbol.type + ')' +
    (symbol.className ? ' Class: ' + symbol.className : '');
  symbolContainer.appendChild(symbolTitleDiv);
}

function renderDictionary(dictionaryContainer) {
  var dictionary = swfFile.dictionary;
  for (var i = 0; i < dictionary.length; i++) {
    if (dictionary[i]) {
      var symbolDiv = document.createElement('div');
      symbolDiv.className = 'swfsymbol';
      var symbol = swfFile.getSymbol(dictionary[i].id);
      renderSymbol(symbolDiv, symbol, i);
      dictionaryContainer.appendChild(symbolDiv);
    }
  }
}

function showFrames() {
  var framesContainer = document.getElementById("frames");
  renderFrames(framesContainer, swfFile.frames);
  var dictionaryContainer = document.getElementById("dictionary");
  renderDictionary(dictionaryContainer);
}

var swfFile;

function setFile(data) {
  document.getElementById("content").removeAttribute("hidden");

  swfFile = null;
  var loadListener = {
    onLoadOpen: function(file) {
      if (file instanceof Shumway.SWF.SWFFile) {
        swfFile = file;
      }
    },
    onLoadProgress: function(update) {
    },
    onLoadError: function() {
    },
    onLoadComplete: function() {
    },
    onNewEagerlyParsedSymbols: function (dictionaryEntries, delta) {
      return Promise.resolve();
    },
    onImageBytesLoaded: function () {}
  };
  var loader = new Shumway.FileLoader(loadListener, null);
  loader.loadBytes(data);

  showHeader(swfFile.data.subarray(0, 8), swfFile.data.length);
  showFrames(swfFile);
}

function onFileChanged() {
  clear();
  var reader = new FileReader();
  reader.onload = function () {
    var data = new Uint8Array(reader.result);
    setFile(data);
  };
  var file =  document.getElementById('swfFile').files[0];
  reader.readAsArrayBuffer(file);
}

function onload() {
  document.getElementById('swfFile').addEventListener('change', onFileChanged);
}
