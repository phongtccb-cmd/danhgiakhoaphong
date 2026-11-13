/**
 * 020_Config.js
 * Configuration, departments, rooms, and assignments.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function isConfigRowActive_(value) {
  const key = foldText_(value);
  return !['false', '0', 'no', 'n', 'khong', 'inactive', 'off'].includes(key);
}

function normalizeConfigType_(value) {
  return foldText_(value).replace(/[\s_-]+/g, '').toUpperCase();
}

function getConfigSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET_NAME);
    sheet.appendRow(CONFIG_HEADERS);

    const initialRows = buildInitialConfigRows_(ss);
    if (initialRows.length > 0) {
      sheet.getRange(2, 1, initialRows.length, CONFIG_HEADERS.length).setValues(initialRows);
    }

    sheet.getRange(1, 1, 1, CONFIG_HEADERS.length).setFontWeight('bold').setBackground('#dbeafe');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, CONFIG_HEADERS.length);
  }
  return sheet;
}

function getDefaultAppConfigRows_() {
  return [
    ['APP', 'app_name', 'Tên ứng dụng', '83 Tiêu chí', '', '', 1, true, 'Tên hiển thị ngắn trong giao diện'],
    ['APP', 'hospital_name', 'Tên bệnh viện', 'Bệnh viện', '', '', 2, true, 'Tên đơn vị sử dụng hệ thống'],
    ['APP', 'logo_url', 'Logo bệnh viện', 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhQqL80XzkD6LL4vftRz2W9TiLyWuFSE8dVNQE-OoLikLZ6osupFjvcQHDPrhnnHgkt6E8fvBi8D7BkKcb5IZp9PTjvtqHEnv3nuh-O3eKh7xZkiwpXRoxv5DxF9aY8A0hqsEcSLnLnRZluDvrYIA1MXEPZ3geJs49lGtPatOib-bSMXPHh6svaRB7hGeM8/s1600/apple-touch-icon-96x96.png', '', '', 3, true, 'URL logo dùng cho màn đăng nhập và PWA icon'],
    ['APP', 'report_year', 'Năm báo cáo', '2026', '', '', 10, true, 'Đổi năm tại đây nếu cần'],
    ['APP', 'report_title', 'Tiêu đề biên bản', 'BIÊN BẢN KIỂM TRA BỆNH VIỆN NĂM 2026', '', '', 11, true, 'Dùng cho file Excel xuất biên bản'],
    ['APP', 'report_plan_line', 'Dòng kế hoạch đính kèm', '(Đính kèm Kế hoạch số 2559/KH-BV ngày 30 tháng 6 năm 2025 của Bệnh viện)', '', '', 12, true, 'Dòng chữ nghiêng dưới tiêu đề biên bản']
  ];
}

function buildInitialConfigRows_(ss) {
  const rows = getDefaultAppConfigRows_();

  DEFAULT_PHONG_OPTIONS.forEach((item, index) => {
    rows.push(['PHONG', item.value, item.label, item.value, '', '', index + 1, true, 'Giá trị phải khớp trường phong trong Data_JSON']);
  });

  const deptSheet = ss.getSheetByName('Department');
  if (deptSheet && deptSheet.getLastRow() >= 2) {
    const deptData = deptSheet.getRange(2, 1, deptSheet.getLastRow() - 1, Math.max(2, deptSheet.getLastColumn())).getValues();
    deptData.forEach((row, index) => {
      const tenKhoa = String(row[0] || '').trim();
      const maKhoa = String(row[1] || '').trim();
      if (tenKhoa) {
        rows.push(['KHOA', maKhoa || tenKhoa, tenKhoa, maKhoa || tenKhoa, '', '', index + 1, true, 'Copy từ sheet Department']);
      }
    });
  }

  const userSheet = ss.getSheetByName('Users');
  if (userSheet && userSheet.getLastRow() >= 2) {
    const data = userSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idxUser = headers.indexOf('Username');
    const idxPass = headers.indexOf('Mật khẩu');
    const idxName = headers.indexOf('Họ và tên');
    const idxPhong = headers.indexOf('Khoa Phòng công tác');
    const idxNhomKT = headers.indexOf('Nhóm kiểm tra');
    const idxQuyen = headers.indexOf('Quyền truy cập');

    if (idxUser !== -1 && idxPass !== -1 && idxName !== -1) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const username = String(row[idxUser] || '').trim();
        if (!username) continue;

        const nhomKiemTra = String(idxNhomKT !== -1 ? row[idxNhomKT] : '').trim();
        const role = sameText_(nhomKiemTra, 'Không') ? 'Khoa' : 'DoanKT';
        rows.push([
          'USER',
          username,
          String(row[idxName] || '').trim(),
          String(row[idxPass] || '').trim(),
          role,
          String(idxQuyen !== -1 ? row[idxQuyen] : '').trim(),
          i,
          true,
          String(idxPhong !== -1 ? row[idxPhong] : '').trim()
        ]);
      }
    }
  }

  return rows;
}

function ensureDefaultAppConfigRows_() {
  const sheet = getConfigSheet_();
  const rows = getConfigSheetData_();
  const existingKeys = {};
  rows
    .filter(row => row.loai === 'APP')
    .forEach(row => {
      if (row.ma) existingKeys[foldText_(row.ma)] = true;
    });

  const missingRows = getDefaultAppConfigRows_().filter(row => !existingKeys[foldText_(row[1])]);
  if (missingRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, missingRows.length, CONFIG_HEADERS.length).setValues(missingRows);
    sheet.autoResizeColumns(1, CONFIG_HEADERS.length);
    invalidateConfigCaches_();
  }
  return missingRows.length;
}

function getConfigRows_(includeInactive) {
  return getCachedJson_(CACHE_SCOPE_CONFIG, 'configRows:' + (includeInactive ? 'all' : 'active'), CACHE_TTL_CONFIG_SECONDS, () => {
    const sheet = getConfigSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    const colCount = Math.max(sheet.getLastColumn(), CONFIG_HEADERS.length);
    const data = sheet.getRange(1, 1, lastRow, colCount).getValues();
    const headers = data[0].map(header => String(header || '').trim());
    const getIdx = (name) => headers.indexOf(name);

    const idx = {
      loai: getIdx('Loai'),
      ma: getIdx('Ma'),
      ten: getIdx('Ten_hien_thi'),
      giaTri1: getIdx('Gia_tri_1'),
      giaTri2: getIdx('Gia_tri_2'),
      danhSach: getIdx('Danh_sach'),
      thuTu: getIdx('Thu_tu'),
      active: getIdx('Active'),
      ghiChu: getIdx('Ghi_chu')
    };

    return data.slice(1).map(row => {
      const getCell = (key) => idx[key] === -1 ? '' : row[idx[key]];
      return {
        loai: normalizeConfigType_(getCell('loai')),
        ma: String(getCell('ma') || '').trim(),
        ten: String(getCell('ten') || '').trim(),
        giaTri1: String(getCell('giaTri1') || '').trim(),
        giaTri2: String(getCell('giaTri2') || '').trim(),
        danhSach: String(getCell('danhSach') || '').trim(),
        thuTu: Number(getCell('thuTu')) || 9999,
        active: isConfigRowActive_(getCell('active')),
        ghiChu: String(getCell('ghiChu') || '').trim()
      };
    }).filter(row => row.loai && (includeInactive || row.active));
  });
}

function getConfigRowsByType_(type) {
  const targetType = normalizeConfigType_(type);
  return getConfigRows_().filter(row => row.loai === targetType);
}

function getSheetByHeader_(ss, candidateNames, requiredHeaderAliases) {
  const allSheets = ss.getSheets();
  const candidates = [];

  candidateNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) candidates.push(sheet);
  });

  allSheets.forEach(sheet => {
    if (!candidates.some(candidate => candidate.getName() === sheet.getName())) {
      candidates.push(sheet);
    }
  });

  for (let i = 0; i < candidates.length; i++) {
    const sheet = candidates[i];
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) continue;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim());
    const hasAllHeaders = requiredHeaderAliases.every(aliasGroup => findHeaderIndex_(headers, aliasGroup) !== -1);
    if (hasAllHeaders) return sheet;
  }

  return null;
}

function getSettingsSheet_(ss) {
  return getSheetByHeader_(ss, SETTINGS_SHEET_CANDIDATES, [
    ['Mã tiêu chí', 'Ma tieu chi', 'maTC', 'criteria_code'],
    ['Phụ trách', 'Phu trach', 'phong', 'department']
  ]);
}

function getCriteriaCodeFromMaGop_(maGop) {
  const text = String(maGop || '').trim();
  if (!text) return '';
  const parts = text.split('-');
  return (parts.length > 1 ? parts[parts.length - 1] : text).trim();
}

function getCriteriaMeta_(criteriaDict, maTC) {
  if (!criteriaDict || !maTC) return null;
  return criteriaDict[maTC] || criteriaDict[foldText_(maTC)] || null;
}

function getCriteriaSettingsDict_(ss) {
  return getCachedJson_(CACHE_SCOPE_SETTINGS, 'criteriaSettingsDict', CACHE_TTL_CONFIG_SECONDS, () => {
    const sheet = getSettingsSheet_(ss);
    if (!sheet || sheet.getLastRow() < 2) return {};

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h || '').trim());
    const idx = {
      id: findHeaderIndex_(headers, ['ID']),
      maTC: findHeaderIndex_(headers, ['Mã tiêu chí', 'Ma tieu chi', 'maTC', 'criteria_code']),
      nhom: findHeaderIndex_(headers, ['Nhóm tiêu chí', 'Nhom tieu chi', 'nhom']),
      phanNhom: findHeaderIndex_(headers, ['Phân nhóm tiêu chí', 'Phan nhom tieu chi', 'phanNhom']),
      noiDung: findHeaderIndex_(headers, ['Nội dung', 'Noi dung', 'noiDung']),
      phuTrach: findHeaderIndex_(headers, ['Phụ trách', 'Phu trach', 'phong', 'department']),
      update: findHeaderIndex_(headers, ['update', 'cap nhat'])
    };

    const groupColumns = [];
    headers.forEach((header, index) => {
      if (foldText_(header).startsWith('nhom ')) {
        groupColumns.push({ name: String(header || '').trim(), index: index });
      }
    });

    const dict = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const maTC = getCellByHeader_(row, idx.maTC);
      if (!maTC) continue;

      const inspectors = {};
      groupColumns.forEach(group => {
        const person = getCellByHeader_(row, group.index);
        if (person) {
          inspectors[group.name] = person;
          inspectors[foldText_(group.name)] = person;
        }
      });

      const meta = {
        id: getCellByHeader_(row, idx.id),
        maTC: maTC,
        nhom: getCellByHeader_(row, idx.nhom) || 'NHÓM KHÁC',
        phanNhom: getCellByHeader_(row, idx.phanNhom) || 'Chưa phân nhóm',
        noiDung: getCellByHeader_(row, idx.noiDung) || 'Không có thông tin nội dung',
        phuTrach: getCellByHeader_(row, idx.phuTrach),
        inspectors: inspectors,
        update: getCellByHeader_(row, idx.update)
      };

      dict[maTC] = meta;
      dict[foldText_(maTC)] = meta;
    }

    return dict;
  });
}

function getLegacyCriteriaDict_(ss) {
  return getCachedJson_(CACHE_SCOPE_SETTINGS, 'legacyCriteriaDict', CACHE_TTL_CONFIG_SECONDS, () => {
    let dictSheet = ss.getSheetByName("Danh_muc");
    if (!dictSheet) dictSheet = ss.getSheetByName("Criteria");

    const criteriaDict = {};
    if (dictSheet) {
      const dictData = dictSheet.getDataRange().getValues();
      for (let i = 1; i < dictData.length; i++) {
        const maTC = String(dictData[i][0] || '').trim();
        if (maTC) {
          const meta = {
            maTC: maTC,
            nhom: String(dictData[i][1] || 'NHÓM KHÁC').trim(),
            phanNhom: String(dictData[i][2] || 'Chưa phân nhóm').trim(),
            noiDung: String(dictData[i][3] || 'Không có thông tin nội dung').trim(),
            phuTrach: '',
            inspectors: {}
          };
          criteriaDict[maTC] = meta;
          criteriaDict[foldText_(maTC)] = meta;
        }
      }
    }

    return criteriaDict;
  });
}

function getCriteriaMetadataDict_(ss) {
  return getCachedJson_(CACHE_SCOPE_SETTINGS, 'criteriaMetadataDict', CACHE_TTL_CONFIG_SECONDS, () => {
    const legacyDict = getLegacyCriteriaDict_(ss);
    const settingsDict = getCriteriaSettingsDict_(ss);
    return Object.assign({}, legacyDict, settingsDict);
  });
}

function getSettingsPhongOptions_(ss) {
  return getCachedJson_(CACHE_SCOPE_SETTINGS, 'settingsPhongOptions', CACHE_TTL_CONFIG_SECONDS, () => {
    const dict = getCriteriaSettingsDict_(ss);
    const seen = {};
    const options = [];

    Object.keys(dict).forEach(key => {
      const meta = dict[key];
      const value = meta && meta.phuTrach ? String(meta.phuTrach).trim() : '';
      const uniqueKey = foldText_(value);
      if (value && !seen[uniqueKey]) {
        seen[uniqueKey] = true;
        options.push({ value: value, label: value });
      }
    });

    return options.sort((a, b) => a.value.localeCompare(b.value));
  });
}

function personMatchesSettingsCell_(cellValue, personNames) {
  const cellText = String(cellValue || '').trim();
  if (!cellText) return false;

  const foldedCell = foldText_(cellText);
  const foldedNames = personNames
    .map(name => foldText_(name))
    .filter(Boolean);

  if (foldedNames.some(name => foldedCell === name)) return true;

  const parts = foldedCell
    .split(/[,;\n\r|/]+/)
    .map(part => part.trim())
    .filter(Boolean);

  return foldedNames.some(name => {
    return parts.includes(name) || foldedCell.includes(name);
  });
}

function getSettingsAssignmentsForUser_(ss, username, displayName) {
  const cacheName = 'assignments:' + sha256Hex_(String(username || '') + '|' + String(displayName || ''));
  return getCachedJson_(CACHE_SCOPE_SETTINGS, cacheName, CACHE_TTL_CONFIG_SECONDS, () => {
    const sheet = getSettingsSheet_(ss);
    if (!sheet || sheet.getLastRow() < 2) return [];

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h || '').trim());
    const idxMaTC = findHeaderIndex_(headers, ['Mã tiêu chí', 'Ma tieu chi', 'maTC', 'criteria_code']);
    const idxPhuTrach = findHeaderIndex_(headers, ['Phụ trách', 'Phu trach', 'phong', 'department']);
    const personNames = uniqueValues_([username, displayName]);
    if (personNames.length === 0) return [];

    const groupColumns = [];
    headers.forEach((header, index) => {
      if (foldText_(header).startsWith('nhom ')) {
        groupColumns.push({ name: String(header || '').trim(), index: index });
      }
    });

    const seen = {};
    const assignments = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const maTC = getCellByHeader_(row, idxMaTC);
      const phong = getCellByHeader_(row, idxPhuTrach);
      if (!maTC || !phong) continue;

      groupColumns.forEach(group => {
        const cellValue = getCellByHeader_(row, group.index);
        if (!personMatchesSettingsCell_(cellValue, personNames)) return;

        const key = foldText_(phong + '|' + group.name);
        if (!seen[key]) {
          seen[key] = true;
          assignments.push({
            khoa: '',
            phong: phong,
            nhom: group.name,
            nguoiCham: cellValue,
            source: 'Settings'
          });
        }
      });
    }

    return assignments;
  });
}

function mergeAssignments_(baseAssignments, settingsAssignments) {
  const seen = {};
  const merged = [];

  (baseAssignments || []).concat(settingsAssignments || []).forEach(item => {
    if (!item) return;
    const khoa = String(item.khoa || '').trim();
    const phong = String(item.phong || '').trim();
    const nhom = String(item.nhom || '').trim();
    const key = foldText_(khoa + '|' + phong + '|' + nhom);
    if (!khoa && !phong) return;
    if (!seen[key]) {
      seen[key] = true;
      merged.push(item);
    }
  });

  return merged;
}

function sortConfigRows_(rows) {
  return rows.sort((a, b) => {
    if (a.thuTu !== b.thuTu) return a.thuTu - b.thuTu;
    return (a.ten || a.ma).localeCompare(b.ten || b.ma);
  });
}

function getConfiguredDepartments_() {
  const rows = sortConfigRows_(getConfigRowsByType_('KHOA'));
  const seen = {};
  const departments = [];

  rows.forEach(row => {
    const name = row.ten || row.ma;
    const code = row.giaTri1 || row.ma || name;
    const key = foldText_(name);
    if (name && !seen[key]) {
      seen[key] = true;
      departments.push({ name: name, code: code });
    }
  });

  return departments;
}

function getLegacyDepartmentCode_(khoa, ss) {
  const deptSheet = ss.getSheetByName('Department');
  if (!deptSheet) return '';

  const deptData = deptSheet.getDataRange().getValues();
  for (let i = 1; i < deptData.length; i++) {
    if (sameText_(deptData[i][0], khoa)) {
      return String(deptData[i][1] || '').trim();
    }
  }
  return '';
}

function getDataJsonRowUnit_(sheetRow, criteriaObj) {
  const row = sheetRow || [];
  const directUnit = String(row[6] || '').trim();
  if (directUnit) return directUnit;

  const candidateFields = ['khoa', 'Khoa', 'khoaPhong', 'KhoaPhong', 'department', 'phong'];
  for (let i = 0; i < candidateFields.length; i++) {
    const value = criteriaObj && criteriaObj[candidateFields[i]];
    if (value) return String(value).trim();
  }

  return getLeadingUnitPrefix_(getEffectiveIdKetQua_(row[0], criteriaObj));
}

function getDataJsonDepartmentUnits_(ss) {
  const spreadsheet = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  const seen = {};
  const units = [];

  rows.forEach(row => {
    const unit = getDataJsonRowUnit_(row, null);
    if (!unit) return;

    const code = getLeadingUnitPrefix_(row[0]) || unit;
    const key = foldText_(unit + '|' + code);
    if (!seen[key]) {
      seen[key] = true;
      units.push({ name: unit, code: code });
    }
  });

  return units;
}

function dataJsonRowMatchesDepartment_(sheetRow, criteriaObj, departmentCode, departmentName) {
  const code = String(departmentCode || '').trim();
  const name = String(departmentName || '').trim();
  if (!code && !name) return false;

  const rowUnit = getDataJsonRowUnit_(sheetRow, criteriaObj);
  const rowId = getEffectiveIdKetQua_(sheetRow && sheetRow[0], criteriaObj);
  const rowMaGop = getEffectiveMaGop_(sheetRow && sheetRow[1], criteriaObj);

  if (rowUnit) {
    if (code && sameText_(rowUnit, code)) return true;
    if (name && sameText_(rowUnit, name)) return true;
  }

  if (code && (foldedStartsWith_(rowId, code) || foldedStartsWith_(rowMaGop, code))) return true;
  if (name && (foldedStartsWith_(rowId, name) || foldedStartsWith_(rowMaGop, name))) return true;

  return false;
}

function getDepartmentCode_(khoa, ss) {
  const spreadsheet = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  const configured = getConfiguredDepartments_();
  const match = configured.find(item => sameText_(item.name, khoa) || sameText_(item.code, khoa));
  if (match) return match.code;

  const legacyCode = getLegacyDepartmentCode_(khoa, spreadsheet);
  if (legacyCode) return legacyCode;

  const dataUnit = getDataJsonDepartmentUnits_(spreadsheet)
    .find(item => sameText_(item.name, khoa) || sameText_(item.code, khoa));
  if (dataUnit) return dataUnit.code || dataUnit.name;

  return String(khoa || '').trim();
}

function resolveDepartmentName_(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const configured = getConfiguredDepartments_();
  const match = configured.find(item => sameText_(item.name, text) || sameText_(item.code, text));
  return match ? match.name : text;
}

function getPhongOptions_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rows = sortConfigRows_(getConfigRowsByType_('PHONG'));
  const seen = {};
  const options = [];

  const addOption = (value, label) => {
    const key = foldText_(value);
    if (value && !seen[key]) {
      seen[key] = true;
      options.push({ value: value, label: label || value });
    }
  };

  getSettingsPhongOptions_(ss).forEach(option => {
    addOption(option.value, option.label);
  });

  rows.forEach(row => {
    const value = row.giaTri1 || row.ma;
    const label = row.ten || row.ma || value;
    addOption(value, label);
  });

  DEFAULT_PHONG_OPTIONS.forEach(option => {
    addOption(option.value, option.label);
  });

  return options.length > 0 ? options : DEFAULT_PHONG_OPTIONS;
}

function getAppSettings_() {
  const settings = {};
  getConfigRowsByType_('APP').forEach(row => {
    if (row.ma) settings[row.ma] = row.giaTri1 || row.ten || '';
  });
  return settings;
}

function buildAssignmentsForConfigUser_(rows, userRow) {
  const assignments = [];
  rows
    .filter(row => row.loai === 'PHANCONG' && sameText_(row.ma, userRow.ma))
    .forEach(row => {
      const khoas = splitConfigList_(row.giaTri1 || row.danhSach || row.ten);
      khoas.forEach(khoa => {
        assignments.push({
          khoa: resolveDepartmentName_(khoa),
          phong: row.giaTri2 || ''
        });
      });
    });

  if (assignments.length === 0) {
    splitConfigList_(userRow.danhSach).forEach(khoa => {
      assignments.push({
        khoa: resolveDepartmentName_(khoa),
        phong: ''
      });
    });
  }

  return assignments.filter(item => item.khoa);
}

function khoiTaoSheetConfig83TC_() {
  const sheet = getConfigSheet_();
  return {
    success: true,
    message: 'Đã sẵn sàng sheet ' + CONFIG_SHEET_NAME,
    sheetName: sheet.getName()
  };
}

function kiemTraSettings83TC_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSettingsSheet_(ss);
  if (!sheet) {
    return {
      success: false,
      message: 'Chưa tìm thấy sheet Settings có đủ cột Mã tiêu chí và Phụ trách.'
    };
  }

  const dict = getCriteriaSettingsDict_(ss);
  const maTCs = uniqueValues_(Object.keys(dict).map(key => dict[key] && dict[key].maTC));
  const phongs = getSettingsPhongOptions_(ss).map(option => option.value);

  return {
    success: true,
    sheetName: sheet.getName(),
    soTieuChi: maTCs.length,
    soPhongPhuTrach: phongs.length,
    phongPhuTrach: phongs
  };
}

function capNhatConfigTuSettings83TC_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const settingsCheck = kiemTraSettings83TC_();
  if (!settingsCheck.success) return settingsCheck;

  const configSheet = getConfigSheet_();
  const configRows = getConfigRows_(true);
  const existingPhongKeys = {};
  configRows
    .filter(row => row.loai === 'PHONG')
    .forEach(row => {
      const value = row.giaTri1 || row.ma;
      if (value) existingPhongKeys[foldText_(value)] = true;
    });

  const options = getSettingsPhongOptions_(ss);
  const newRows = [];
  options.forEach((option, index) => {
    const key = foldText_(option.value);
    if (!existingPhongKeys[key]) {
      newRows.push([
        'PHONG',
        option.value,
        option.label || option.value,
        option.value,
        '',
        '',
        100 + index,
        true,
        'Đồng bộ từ sheet Settings'
      ]);
      existingPhongKeys[key] = true;
    }
  });

  if (newRows.length > 0) {
    configSheet.getRange(configSheet.getLastRow() + 1, 1, newRows.length, CONFIG_HEADERS.length).setValues(newRows);
    configSheet.autoResizeColumns(1, CONFIG_HEADERS.length);
  }

  return {
    success: true,
    message: 'Đã đồng bộ ' + newRows.length + ' phòng phụ trách mới từ Settings vào ' + CONFIG_SHEET_NAME + '.',
    added: newRows.length,
    totalPhongFromSettings: options.length
  };
}

// Configuration APIs exposed to the web client

function getDanhSachKhoaTuDepartment(sessionToken) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;

    const departmentUnits = getDepartmentsForList_();
    if (departmentUnits.length > 0) {
      const departmentNames = departmentUnits
        .filter(item => hasDepartmentUnitAccess_(auth.user, item))
        .map(item => item.name);
      return { success: true, data: uniqueValues_(departmentNames) };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const deptSheet = ss.getSheetByName("Department");
    if (!deptSheet) return { success: false, message: "Không tìm thấy sheet Department" };
    
    const data = deptSheet.getDataRange().getValues();
    const listKhoa = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && hasKhoaAccess_(auth.user, data[i][0])) listKhoa.push(data[i][0]);
    }
    return { success: true, data: listKhoa };
  } catch (e) {
    return { success: false, message: "Lỗi tải danh sách Khoa: " + e.message };
  }
}

function getDanhSachPhongPhuTrach(sessionToken, khoa) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;

    const allOptions = getPhongOptions_();
    if (getUserEffectiveChecklistRole_(auth.user) === 'Khoa') {
      return { success: true, data: allOptions };
    }

    const assignedPhongs = getAssignedPhongsForUser_(auth.user, khoa);
    if (assignedPhongs.length === 0 || assignedPhongs.some(isAllAccessValue_)) {
      return { success: true, data: allOptions };
    }

    const filteredOptions = allOptions.filter(option => {
      return assignedPhongs.some(phong => sameText_(phong, option.value));
    });

    return { success: true, data: filteredOptions };
  } catch (e) {
    return { success: false, message: "Lỗi tải danh sách Phòng phụ trách: " + e.message };
  }
}
