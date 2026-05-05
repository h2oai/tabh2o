var SIDEBAR_URL = "https://tabh2o.h2oai.com/plugins/gsheets";
var PREDICT_URL = "https://tabh2o.h2oai.com/api/v1/predict";
var API_KEY_PROP = "tabh2o_api_key";

function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu("TabH2O")
    .addItem("Open", "openSidebar")
    .addItem("About", "showAbout")
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function openSidebar() {
  var bridge =
    "<!DOCTYPE html><html><head>" +
    "<style>html,body{margin:0;padding:0;height:100%;overflow:hidden}" +
    "iframe{width:100%;height:100%;border:none}</style></head><body>" +
    '<iframe id="f" src="' + SIDEBAR_URL + '"></iframe>' +
    "<script>" +
    'var f=document.getElementById("f");' +
    'var ALLOWED={"getActiveSheetName":1,"readSheetData":1,"writePredictions":1,"callPredict":1,"loadApiKey":1,"validateSheet":1};' +
    'var ORIGIN="' + SIDEBAR_URL.replace(/\/[^/]*$/, "").replace(/^(https?:\/\/[^/]+).*/, "$1") + '";' +
    'window.addEventListener("message",function(e){' +
    "if(e.origin!==ORIGIN)return;" +
    "var m=e.data;if(!m||m.type!=='rpc')return;" +
    "if(!ALLOWED[m.fn])return;" +
    "var r=google.script.run" +
    ".withSuccessHandler(function(v){f.contentWindow.postMessage({type:'rpc_ok',id:m.id,result:v},ORIGIN)})" +
    ".withFailureHandler(function(err){f.contentWindow.postMessage({type:'rpc_err',id:m.id,error:err.message||String(err)},ORIGIN)});" +
    "r[m.fn].apply(r,m.args||[]);" +
    "});" +
    "var _lastActive=null;" +
    "function _pollActive(){" +
      "google.script.run" +
        ".withSuccessHandler(function(n){" +
          "if(n&&n!==_lastActive){_lastActive=n;f.contentWindow.postMessage({type:'activeSheetChanged',name:n},ORIGIN);}" +
          "setTimeout(_pollActive,0);" +
        "})" +
        ".withFailureHandler(function(){setTimeout(_pollActive,500);})" +
        ".getActiveSheetName();" +
    "}" +
    "f.addEventListener('load',_pollActive);" +
    "<\/script></body></html>";
  var html = HtmlService.createHtmlOutput(bridge).setTitle("TabH2O");
  SpreadsheetApp.getUi().showSidebar(html);
}

function showAbout() {
  var html = HtmlService.createHtmlOutput(
    '<html><body style="margin:0;overflow:hidden;">' +
    '<div style="font-family:sans-serif;padding:5px 5px;text-align:center;">' +
    '<img src="https://tabh2o-public.cdn.h2oai.com/assets/logos/tabh2o-80.png" width="48" height="48" style="margin-bottom:6px;"><br>' +
    '<b style="font-size:15px;">TabH2O</b><br>' +
    '<span style="color:#999;font-size:11px;">v1.0.0</span><br>' +
    '<span style="color:#666;font-size:12px;">Tabular predictions for your spreadsheet data</span><br><br>' +
    '<span style="font-size:12px;">Powered by <a href="https://tabh2o.h2oai.com" target="_blank">tabh2o.h2oai.com</a></span><br>' +
    '</div></body></html>'
  ).setWidth(260).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, "About TabH2O");
}

function getSheetNames() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .map(s => s.getName());
}

function getActiveSheetName() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
}

function validateSheet(sheetName, colIndices, expectedHeaders, expectedRowCount) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' no longer exists.");
  var data = sheet.getDataRange();
  var currentRowCount = data.getNumRows();
  if (currentRowCount !== expectedRowCount) {
    throw new Error("Row count changed (" + expectedRowCount + " \u2192 " + currentRowCount + "). Please reload.");
  }
  var row1 = sheet.getRange(1, 1, 1, data.getNumColumns()).getValues()[0];
  for (var i = 0; i < colIndices.length; i++) {
    if (String(row1[colIndices[i]] || "") !== String(expectedHeaders[i] || "")) {
      throw new Error("Column structure changed since data was loaded. Please reload.");
    }
  }
  return true;
}

function getHiddenMetadata(spreadsheetId, sheetName) {
  var hiddenRows = {};
  var hiddenCols = {};
  var body;
  try {
    body = Sheets.Spreadsheets.get(spreadsheetId, {
      ranges: ["'" + sheetName.replace(/'/g, "''") + "'"],
      includeGridData: true,
      fields: "sheets(properties(title),data(rowMetadata(hiddenByUser,hiddenByFilter),columnMetadata(hiddenByUser)))",
    });
  } catch (_) {
    return { hiddenRows: hiddenRows, hiddenCols: hiddenCols };
  }
  var d = body && body.sheets && body.sheets[0] && body.sheets[0].data && body.sheets[0].data[0];
  if (!d) return { hiddenRows: hiddenRows, hiddenCols: hiddenCols };
  var rm = d.rowMetadata || [];
  for (var i = 0; i < rm.length; i++) if (rm[i] && (rm[i].hiddenByUser || rm[i].hiddenByFilter)) hiddenRows[i] = true;
  var cm = d.columnMetadata || [];
  for (var j = 0; j < cm.length; j++) if (cm[j] && cm[j].hiddenByUser) hiddenCols[j] = true;
  return { hiddenRows: hiddenRows, hiddenCols: hiddenCols };
}

function readSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = sheetName
    ? ss.getSheetByName(sheetName)
    : ss.getActiveSheet();

  if (!sheet) {
    throw new Error("Sheet '" + sheetName + "' not found.");
  }

  var data = sheet.getDataRange();
  var allValues = data.getValues();

  if (!allValues || allValues.length < 2) {
    return { headers: [], rows: [], sheetName: sheet.getName() };
  }

  var hidden = getHiddenMetadata(ss.getId(), sheet.getName());
  var hiddenRows = hidden.hiddenRows;
  var hiddenCols = hidden.hiddenCols;
  var numCols = allValues[0] ? allValues[0].length : 0;

  var rangeList = sheet.getActiveRangeList();
  var active = sheet.getActiveRange();

  var isFullSheet =
    active &&
    active.getNumRows() >= sheet.getMaxRows() &&
    active.getNumColumns() >= sheet.getMaxColumns();

  if (rangeList && rangeList.getRanges().length === 1) {
    var sel = rangeList.getRanges()[0];
    var isSingleRow = sel.getNumRows() <= 1 && sel.getNumColumns() > 1;
    var isSingleCol = sel.getNumColumns() <= 1 && sel.getNumRows() > 1;
    if (isSingleRow || isSingleCol) {
      var sR = Math.max(0, sel.getRow() - 1);
      var eR = Math.min(sel.getRow() - 1 + sel.getNumRows(), allValues.length);
      var sC = Math.max(0, sel.getColumn() - 1);
      var eC = Math.min(sel.getColumn() - 1 + sel.getNumColumns(), numCols);
      var selHasData = false;
      for (var sr = sR; sr < eR && !selHasData; sr++) {
        for (var sc = sC; sc < eC && !selHasData; sc++) {
          var sv = allValues[sr][sc];
          if (sv !== "" && sv !== null && sv !== undefined) selHasData = true;
        }
      }
      if (selHasData) {
        if (isSingleRow && !hiddenRows[sel.getRow() - 1]) {
          throw new Error("Selection only spans 1 row. Select at least 2 rows (header + data) or the entire sheet.");
        }
        if (isSingleCol && !hiddenCols[sel.getColumn() - 1]) {
          throw new Error("Selection only spans 1 column. Select at least 2 columns (features + target) or the entire sheet.");
        }
      }
    }
  }

  var isSingleCell = rangeList && rangeList.getRanges().length === 1 &&
    rangeList.getRanges()[0].getNumColumns() <= 1 && rangeList.getRanges()[0].getNumRows() <= 1;

  var useFullSheet = !rangeList || isFullSheet || isSingleCell;
  var colIndices, selectedRows;

  if (!useFullSheet) {
    var colSet = {};
    var rowSet = {};
    var ranges = rangeList.getRanges();
    for (var r = 0; r < ranges.length; r++) {
      var rng = ranges[r];
      var startCol = rng.getColumn() - 1;
      for (var c = startCol; c < startCol + rng.getNumColumns(); c++) colSet[c] = true;
      var startRow = rng.getRow() - 1;
      var endRow = Math.min(startRow + rng.getNumRows(), allValues.length);
      for (var row = startRow; row < endRow; row++) rowSet[row] = true;
    }
    for (var key in colSet) { if (hiddenCols[key]) delete colSet[key]; }
    for (var key in rowSet) { if (hiddenRows[key]) delete rowSet[key]; }
    var selectionEmpty = !Object.keys(rowSet).some(ri => {
      return Object.keys(colSet).some(ci => {
        var v = allValues[ri][ci];
        return v !== "" && v !== null && v !== undefined;
      });
    });
    if (selectionEmpty) {
      useFullSheet = true;
    } else {
      selectedRows = Object.keys(rowSet).map(Number).filter(r => r >= 1).sort((a, b) => a - b);
      colIndices = Object.keys(colSet).map(Number)
        .filter(i => i >= 0 && i < allValues[0].length && allValues[0][i] !== "" && allValues[0][i] !== null)
        .sort((a, b) => a - b)
        .filter(ci => selectedRows.some(r => {
          var v = allValues[r][ci];
          return v !== "" && v !== null && v !== undefined;
        }));
    }
  }

  if (useFullSheet) {
    colIndices = allValues[0].map((_, i) => i).filter(i => !hiddenCols[i]);
    selectedRows = [];
    for (var r = 1; r < allValues.length; r++) { if (!hiddenRows[r]) selectedRows.push(r); }
  }

  var headers = colIndices.map(i => String(allValues[0][i]));
  var dupes = {};
  var dupeNames = [];
  for (var h = 0; h < headers.length; h++) {
    if (dupes[headers[h]]) { if (dupes[headers[h]] === 1) dupeNames.push(headers[h]); }
    dupes[headers[h]] = (dupes[headers[h]] || 0) + 1;
  }
  if (dupeNames.length) {
    throw new Error("Duplicate column names: " + dupeNames.join(", "));
  }
  var rowMap = [];
  var rows = [];
  for (var ri of selectedRows) {
    var r = allValues[ri];
    if (!colIndices.some(i => r[i] !== "" && r[i] !== null)) continue;
    rows.push(colIndices.map(i => {
      var c = r[i];
      if (c instanceof Date) return c.getTime();
      if (typeof c === "string" && c !== "" && !isNaN(Number(c))) return Number(c);
      return c;
    }));
    rowMap.push(ri + 1);
  }

  return {
    headers,
    rows,
    sheetName: sheet.getName(),
    startCol: colIndices[0] || 0,
    colIndices,
    rowMap,
    totalRows: allValues.length,
  };
}

var PREDICTION_COLOR = { red: 0x7C / 255, green: 0x3A / 255, blue: 0xED / 255 };

function writePredictions(sheetName, colIndex, rowPositions, predictions) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' not found.");

  if (!rowPositions.length) return;

  var sheetId = sheet.getSheetId();
  var requests = rowPositions.map(function (row, i) {
    var v = predictions[i];
    var userEnteredValue =
      typeof v === "number" && isFinite(v) ? { numberValue: v }
      : typeof v === "boolean"              ? { boolValue: v }
      :                                       { stringValue: String(v == null ? "" : v) };
    return {
      updateCells: {
        start: { sheetId: sheetId, rowIndex: row - 1, columnIndex: colIndex },
        rows: [{
          values: [{
            userEnteredValue: userEnteredValue,
            userEnteredFormat: {
              textFormat: { bold: true, foregroundColor: PREDICTION_COLOR },
            },
          }],
        }],
        fields: "userEnteredValue,userEnteredFormat.textFormat(bold,foregroundColor)",
      },
    };
  });

  Sheets.Spreadsheets.batchUpdate({ requests: requests }, ss.getId());

  ss.setActiveSheet(sheet);
  sheet.setActiveRange(sheet.getRange(rowPositions[0], colIndex + 1));
}

function loadApiKey() {
  return PropertiesService.getUserProperties().getProperty(API_KEY_PROP) || "";
}

function callPredict(apiKey, payload) {
  if (apiKey && apiKey.trim()) {
    PropertiesService.getUserProperties().setProperty(API_KEY_PROP, apiKey);
  }
  var response = UrlFetchApp.fetch(PREDICT_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code !== 200) {
    var detail = "Prediction failed";
    try {
      var err = JSON.parse(text);
      detail = err.message || err.detail || detail;
      if (err.details && err.details.length) {
        detail += "\n\n" + err.details.map(function (d) { return d.message; }).join("\n");
      }
    } catch (_) { detail = text || detail; }
    throw new Error(detail);
  }
  return JSON.parse(text);
}
