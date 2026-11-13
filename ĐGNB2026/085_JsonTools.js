/**
 * 085_JsonTools.js
 * Spreadsheet utilities for converting and aggregating legacy JSON data.
 */

// Spreadsheet utility menu for building Data_JSON rows from a flat source sheet.
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Cong cu JSON')
    .addItem('Chuyen doi cac hang thanh JSON phang', 'convertColumnsToJSON')
    .addItem('Bat dau gop JSON theo lo', 'aggregateJSONByKetQua')
    .addItem('Tiep tuc gop JSON dang do', 'aggregateJSONByKetQuaContinue')
    .addItem('Kiem tra so ID_ketqua duy nhat', 'aggregateJSONByKetQuaCountIds')
    .addSeparator()
    .addItem('Dry-run chuan hoa Data_JSON', 'normalizeDataJsonStructureDryRun')
    .addItem('APPLY chuan hoa Data_JSON', 'normalizeDataJsonStructureApply')
    .addSeparator()
    .addItem('Huy trang thai gop dang do', 'aggregateJSONByKetQuaReset')
    .addToUi();
}

function jsonToolFoldText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\s+/g, ' ');
}

function jsonToolGetMappedHeaders_(headers) {
  var mappingConfig = {
    'id danhgiact': 'id',
    'id_danhgiact': 'id',
    'id': 'id',
    'id ketqua': 'ID_ketqua',
    'id_ketqua': 'ID_ketqua',
    'idkq': 'ID_ketqua',
    'ma gop': 'magop',
    'magop': 'magop',
    'muc do': 'mucdo',
    'mucdo': 'mucdo',
    'noi dung tieu chi': 'noidungtc',
    'noidungtc': 'noidungtc',
    'noi dung kiem tra': 'noidungkt',
    'noidungkt': 'noidungkt',
    'phuong phap kiem tra': 'phuongphap',
    'phuongphap': 'phuongphap',
    'bang chung': 'bangchung',
    'bangchung': 'bangchung',
    'ghi chu': 'ghichu',
    'ghichu': 'ghichu',
    'phu trach': 'phong',
    'phutrch': 'phong',
    'phong': 'phong',
    'diem': 'diem',
    'diem tu cham': 'diemtc',
    'diem khoa cham': 'diemtc',
    'diem tc': 'diemtc',
    'diemtc': 'diemtc',
    'diemtc bv': 'diemtc_bv',
    'diemtc_bv': 'diemtc_bv',
    'diem doan': 'diem_doan',
    'diem_doan': 'diem_doan',
    'diemtc doan': 'diemtc_doan',
    'diemtc_doan': 'diemtc_doan',
    'nguoi danh gia': 'nguoicham',
    'nguoidanhgia': 'nguoicham',
    'nguoi cham': 'nguoicham',
    'nguoicham': 'nguoicham',
    'minh chung': 'Minhchung',
    'minhchung': 'Minhchung',
    'ap dung khoa': 'nhomkt',
    'apdungkhoa': 'nhomkt',
    'nhomkt': 'nhomkt'
  };

  var keyIndices = {};
  for (var i = 0; i < headers.length; i++) {
    if (!headers[i]) continue;
    var headerClean = jsonToolFoldText_(headers[i]);
    if (mappingConfig[headerClean]) {
      keyIndices[mappingConfig[headerClean]] = i;
    }
  }
  return keyIndices;
}

function jsonToolIsBlank_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function jsonToolScoreValue_(value) {
  if (jsonToolIsBlank_(value)) return '';
  return String(value).trim();
}

function jsonToolCalculateScore_(items, scoreField) {
  if (!items || items.length === 0) return '';

  var hasScored = items.some(function(item) {
    return !jsonToolIsBlank_(item[scoreField]);
  });
  if (!hasScored) return '';

  function checkPassLevel(level) {
    var levelItems = items.filter(function(item) {
      return String(item.mucdo) === String(level);
    });
    if (levelItems.length === 0) return false;
    return levelItems.every(function(item) {
      return String(item[scoreField]) === '1';
    });
  }

  if (!checkPassLevel(2)) return 1;
  if (!checkPassLevel(3)) return 2;
  if (!checkPassLevel(4)) return 3;
  if (!checkPassLevel(5)) return 4;
  return 5;
}

function convertColumnsToJSON() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Khong tim thay du lieu tu hang 2 tro di.');
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var jsonArray = [];
  var tz = Session.getScriptTimeZone();

  for (var i = 0; i < data.length; i++) {
    var rowData = data[i];
    var rowObject = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j] ? headers[j].toString().trim() : 'Cot_' + (j + 1);
      if (headerName === 'JSON Phang') continue;

      var cellValue = rowData[j];
      if (cellValue instanceof Date) {
        cellValue = Utilities.formatDate(cellValue, tz, 'yyyy-MM-dd HH:mm:ss');
      }
      rowObject[headerName] = cellValue;
    }
    jsonArray.push([JSON.stringify(rowObject)]);
  }

  var writeCol = lastCol + 1;
  if (headers[lastCol - 1] === 'JSON Phang') {
    writeCol = lastCol;
  }

  sheet.getRange(2, writeCol, jsonArray.length, 1).setValues(jsonArray);
  sheet.getRange(1, writeCol).setValue('JSON Phang').setFontWeight('bold');
  SpreadsheetApp.getUi().alert('Da chuyen doi JSON phang tai cot so ' + writeCol);
}

var JSON_TOOL_AGGREGATE_STATE_KEY = 'JSON_TOOL_AGGREGATE_STATE_V1';
var JSON_TOOL_PROCESS_MS = 210000;
var JSON_TOOL_READ_BATCH_ROWS = 300;
var JSON_TOOL_WRITE_BATCH_ROWS = 25;

function jsonToolGetSheetById_(ss, sheetId) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === Number(sheetId)) return sheets[i];
  }
  return null;
}

function jsonToolMakeGetter_(keyIndices, tz) {
  return function(rowData, key) {
    var idx = keyIndices[key];
    if (idx === undefined) return '';
    var val = rowData[idx];
    if (val instanceof Date) {
      return Utilities.formatDate(val, tz, 'yyyy-MM-dd HH:mm:ss');
    }
    return val;
  };
}

function jsonToolBuildGroupFromRow_(rowData, getCellValue, idKetQua) {
  return {
    ID_ketqua: idKetQua,
    magop: getCellValue(rowData, 'magop'),
    phong: getCellValue(rowData, 'phong'),
    nguoicham: getCellValue(rowData, 'nguoicham'),
    nhomkt: getCellValue(rowData, 'nhomkt'),
    danh_sach_muc_do: []
  };
}

function jsonToolAppendChildFromRow_(group, rowData, getCellValue) {
  var mucDoRaw = getCellValue(rowData, 'mucdo');
  var mucDoNum = Number(mucDoRaw);
  var mucDoFinal = (isNaN(mucDoNum) || jsonToolIsBlank_(mucDoRaw)) ? mucDoRaw : mucDoNum;

  var diemTuCham = jsonToolScoreValue_(getCellValue(rowData, 'diemtc_bv'));
  if (diemTuCham === '') {
    diemTuCham = jsonToolScoreValue_(getCellValue(rowData, 'diemtc'));
  }

  var diemDoan = jsonToolScoreValue_(getCellValue(rowData, 'diemtc_doan'));
  if (diemDoan === '') {
    diemDoan = jsonToolScoreValue_(getCellValue(rowData, 'diem_doan'));
  }
  if (diemDoan === '') {
    diemDoan = jsonToolScoreValue_(getCellValue(rowData, 'diem'));
  }

  var childObj = {
    id: getCellValue(rowData, 'id'),
    mucdo: mucDoFinal,
    noidungtc: getCellValue(rowData, 'noidungtc'),
    noidungkt: getCellValue(rowData, 'noidungkt'),
    phuongphap: getCellValue(rowData, 'phuongphap'),
    bangchung: getCellValue(rowData, 'bangchung'),
    ghichu: getCellValue(rowData, 'ghichu'),
    diemtc: diemTuCham,
    Minhchung: getCellValue(rowData, 'Minhchung')
  };

  if (diemDoan !== '') {
    childObj.diem = diemDoan;
    childObj.diem_doan = diemDoan;
    childObj.diemtc_doan = diemDoan;
  }

  group.danh_sach_muc_do.push(childObj);
}

function jsonToolBuildOutputRow_(rootItem) {
  var bvScore = jsonToolCalculateScore_(rootItem.danh_sach_muc_do, 'diemtc');
  if (bvScore !== '') {
    rootItem.diemtc = bvScore;
  }

  var doanScore = jsonToolCalculateScore_(rootItem.danh_sach_muc_do, 'diem');
  if (doanScore !== '') {
    rootItem.diemtc_doan = doanScore;
  }

  var hasMissingScore = rootItem.danh_sach_muc_do.some(function(item) {
    return jsonToolIsBlank_(item.diemtc);
  });
  var status = hasMissingScore ? 'Dang cham dang do' : 'Da hoan thanh phan viec';
  var mcJson = JSON.stringify({ ID_ketqua: rootItem.ID_ketqua, ChiTietMC: [] });

  return [
    rootItem.ID_ketqua,
    rootItem.magop,
    JSON.stringify(rootItem),
    status,
    new Date(),
    rootItem.nguoicham,
    rootItem.phong,
    mcJson
  ];
}

function jsonToolFlushRows_(sheet, rows) {
  if (rows.length === 0) return;
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  rows.length = 0;
}

function jsonToolFlushRowsAt_(sheet, rows, startRow) {
  if (rows.length === 0) return startRow;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  var nextRow = startRow + rows.length;
  rows.length = 0;
  return nextRow;
}

function aggregateJSONByKetQua() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Ban can dung o sheet chua du lieu de bam gop.');
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var keyIndices = jsonToolGetMappedHeaders_(headers);

  if (keyIndices.ID_ketqua === undefined) {
    SpreadsheetApp.getUi().alert('Khong tim thay cot ID_ketqua hoac IDKQ o hang 1.');
    return;
  }

  var tz = Session.getScriptTimeZone();
  var resultSheetName = 'Data_JSON_Gop_' + Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmmss');
  var newSheet = ss.insertSheet(resultSheetName);
  var outputHeader = [['ID_ketqua', 'magop', 'Du lieu JSON', 'Trang thai', 'Lan cap nhat cuoi', 'Nguoi cham', 'Khoa/Phong', 'MC_JSON']];
  newSheet.getRange(1, 1, 1, outputHeader[0].length).setValues(outputHeader);
  newSheet.getRange(1, 1, 1, outputHeader[0].length).setFontWeight('bold').setBackground('#d4edda').setHorizontalAlignment('center');

  PropertiesService.getDocumentProperties().setProperty(JSON_TOOL_AGGREGATE_STATE_KEY, JSON.stringify({
    sourceSheetId: sheet.getSheetId(),
    outputSheetId: newSheet.getSheetId(),
    nextRow: 2,
    nextOutputRow: 2,
    lastRow: lastRow,
    lastCol: lastCol,
    headers: headers,
    outputSheetName: resultSheetName
  }));

  aggregateJSONByKetQuaContinue();
}

function aggregateJSONByKetQuaContinue() {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) {
    SpreadsheetApp.getUi().alert('Dang co tien trinh gop khac dang chay. Vui long thu lai sau.');
    return;
  }

  try {
    var props = PropertiesService.getDocumentProperties();
    var stateText = props.getProperty(JSON_TOOL_AGGREGATE_STATE_KEY);
    if (!stateText) {
      SpreadsheetApp.getUi().alert('Khong co tien trinh gop dang do. Hay chon "Bat dau gop JSON theo lo" truoc.');
      return;
    }

    var state = JSON.parse(stateText);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sourceSheet = jsonToolGetSheetById_(ss, state.sourceSheetId);
    var outputSheet = jsonToolGetSheetById_(ss, state.outputSheetId);
    if (!sourceSheet || !outputSheet) {
      props.deleteProperty(JSON_TOOL_AGGREGATE_STATE_KEY);
      SpreadsheetApp.getUi().alert('Khong tim thay sheet nguon hoac sheet ket qua. Da huy trang thai gop.');
      return;
    }

    var startedAt = Date.now();
    var tz = Session.getScriptTimeZone();
    var keyIndices = jsonToolGetMappedHeaders_(state.headers);
    var getCellValue = jsonToolMakeGetter_(keyIndices, tz);
    var outputRows = [];
    var currentGroup = null;
    var rowPointer = Number(state.nextRow);
    var nextOutputRow = Number(state.nextOutputRow || (outputSheet.getLastRow() + 1));
    var processedRows = 0;
    var completedGroups = 0;
    var shouldPause = false;

    while (rowPointer <= Number(state.lastRow)) {
      var rowsToRead = Math.min(JSON_TOOL_READ_BATCH_ROWS, Number(state.lastRow) - rowPointer + 1);
      var data = sourceSheet.getRange(rowPointer, 1, rowsToRead, Number(state.lastCol)).getValues();
      var idx = 0;

      while (idx < data.length) {
        var actualRow = rowPointer + idx;
        var rowData = data[idx];
        var idKetQuaRaw = getCellValue(rowData, 'ID_ketqua');

        if (jsonToolIsBlank_(idKetQuaRaw)) {
          idx++;
          processedRows++;
          state.nextRow = actualRow + 1;
          continue;
        }

        var idKetQua = String(idKetQuaRaw).trim();
        if (currentGroup && currentGroup.ID_ketqua !== idKetQua) {
          outputRows.push(jsonToolBuildOutputRow_(currentGroup));
          completedGroups++;
          currentGroup = null;
          state.nextRow = actualRow;

          if (outputRows.length >= JSON_TOOL_WRITE_BATCH_ROWS) {
            nextOutputRow = jsonToolFlushRowsAt_(outputSheet, outputRows, nextOutputRow);
            state.nextOutputRow = nextOutputRow;
          }

          if (Date.now() - startedAt > JSON_TOOL_PROCESS_MS) {
            shouldPause = true;
            break;
          }
          continue;
        }

        if (!currentGroup) {
          currentGroup = jsonToolBuildGroupFromRow_(rowData, getCellValue, idKetQua);
        }

        jsonToolAppendChildFromRow_(currentGroup, rowData, getCellValue);
        idx++;
        processedRows++;
        state.nextRow = actualRow + 1;
      }

      if (shouldPause) break;
      rowPointer += rowsToRead;
    }

    if (!shouldPause && currentGroup) {
      outputRows.push(jsonToolBuildOutputRow_(currentGroup));
      completedGroups++;
      currentGroup = null;
    }

    nextOutputRow = jsonToolFlushRowsAt_(outputSheet, outputRows, nextOutputRow);
    state.nextOutputRow = nextOutputRow;

    if (!shouldPause && Number(state.nextRow) > Number(state.lastRow)) {
      props.deleteProperty(JSON_TOOL_AGGREGATE_STATE_KEY);
      ss.toast('Da gop JSON xong tai sheet: ' + state.outputSheetName + '. Tong dong ket qua: ' + (nextOutputRow - 2) + '.', 'Cong cu JSON', 10);
      return;
    }

    props.setProperty(JSON_TOOL_AGGREGATE_STATE_KEY, JSON.stringify(state));
    ss.toast(
      'Da tam dung de tranh qua thoi gian Apps Script.\n' +
      'Sheet ket qua: ' + state.outputSheetName + '\n' +
      'Dong se xu ly tiep: ' + state.nextRow + '/' + state.lastRow + '\n' +
      'Dong da doc trong luot nay: ' + processedRows + '\n' +
      'Nhom da ghi trong luot nay: ' + completedGroups + '\n\n' +
      'Bam menu "Tiep tuc gop JSON dang do" de chay tiep.',
      'Cong cu JSON',
      15
    );
  } finally {
    lock.releaseLock();
  }
}

function aggregateJSONByKetQuaCountIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2) {
    ss.toast('Sheet hien tai khong co du lieu.', 'Cong cu JSON', 8);
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var keyIndices = jsonToolGetMappedHeaders_(headers);
  if (keyIndices.ID_ketqua === undefined) {
    SpreadsheetApp.getUi().alert('Khong tim thay cot ID_ketqua hoac IDKQ o hang 1.');
    return;
  }

  var idCol = keyIndices.ID_ketqua + 1;
  var seen = {};
  var uniqueCount = 0;
  var nonBlankCount = 0;
  var batchSize = 1000;

  for (var row = 2; row <= lastRow; row += batchSize) {
    var rowsToRead = Math.min(batchSize, lastRow - row + 1);
    var values = sheet.getRange(row, idCol, rowsToRead, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0];
      if (jsonToolIsBlank_(id)) continue;
      nonBlankCount++;
      var key = String(id).trim();
      if (!seen[key]) {
        seen[key] = true;
        uniqueCount++;
      }
    }
  }

  ss.toast(
    'Dong du lieu co ID: ' + nonBlankCount + '. ID_ketqua duy nhat: ' + uniqueCount + '. Ket qua gop se co khoang ' + (uniqueCount + 1) + ' dong tinh ca header.',
    'Cong cu JSON',
    15
  );
}

function aggregateJSONByKetQuaReset() {
  PropertiesService.getDocumentProperties().deleteProperty(JSON_TOOL_AGGREGATE_STATE_KEY);
  SpreadsheetApp.getUi().alert('Da huy trang thai gop JSON dang do.');
}
