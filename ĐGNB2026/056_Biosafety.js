/**
 * 056_Biosafety.js
 * Biosafety checklist services for laboratory departments.
 */

const BIOSAFETY_MASTER_SHEET_CANDIDATES = ['ATSH_Master', 'BK ATSH - Sheet1', 'BangKiem_ATSH', 'Bang kiem ATSH', 'Bảng kiểm ATSH'];
const BIOSAFETY_RESULT_SHEET_NAME = 'ATSH_Result';
const BIOSAFETY_RESULT_HEADERS = ['ID_Phieu', 'Ky_danh_gia', 'Khoa', 'Trang_thai', 'Lan_cap_nhat_cuoi', 'Nguoi_cap_nhat', 'Result_JSON'];
const BIOSAFETY_RESULTS = ['Đạt', 'Không đạt', 'Không áp dụng'];

function getBiosafetyDepartments_(user) {
  if (typeof getAllowedLab2429Departments_ === 'function') {
    return getAllowedLab2429Departments_(user);
  }
  return [];
}

function getBiosafetyDepartmentByName_(name) {
  if (typeof getLab2429DepartmentByName_ === 'function') return getLab2429DepartmentByName_(name);
  return null;
}

function userCanAccessBiosafetyDept_(user, deptName) {
  if (typeof userCanAccessLab2429Dept_ === 'function') return userCanAccessLab2429Dept_(user, deptName);
  return !!(user && userHasRole_(user, 'Admin'));
}

function getBiosafetyModeForUser_(user) {
  if (!user) return 'readonly';
  if (userHasRole_(user, 'Admin')) return 'admin';
  if (userHasRole_(user, 'DoanXN') || userHasRole_(user, 'TruongNhom') || userHasRole_(user, 'ThuKi')) return 'doan_kiem_tra';
  if (userHasRole_(user, 'Khoa')) return 'khoa';
  return 'readonly';
}

function requireBiosafetyAccess_(sessionToken, deptName, writeMode) {
  const auth = requireSession_(sessionToken);
  if (!auth.success) return auth;
  const dept = getBiosafetyDepartmentByName_(deptName);
  if (!dept) return failResponse_('Không tìm thấy khoa xét nghiệm: ' + String(deptName || ''));
  if (!userCanAccessBiosafetyDept_(auth.user, dept.name)) {
    return forbiddenResponse_('Bạn không có quyền truy cập bảng kiểm an toàn sinh học của khoa: ' + dept.name);
  }
  if (writeMode && !(userHasRole_(auth.user, 'Khoa') || userHasRole_(auth.user, 'DoanXN') || userHasRole_(auth.user, 'Admin'))) {
    return forbiddenResponse_('Vai trò hiện tại không được lưu bảng kiểm an toàn sinh học.');
  }
  return auth;
}

function getBiosafetyMasterSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  for (let i = 0; i < BIOSAFETY_MASTER_SHEET_CANDIDATES.length; i++) {
    const sheet = ss.getSheetByName(BIOSAFETY_MASTER_SHEET_CANDIDATES[i]);
    if (sheet && sheet.getLastRow() >= 2) return sheet;
  }
  return null;
}

function getBiosafetyResultSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(BIOSAFETY_RESULT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BIOSAFETY_RESULT_SHEET_NAME);
    sheet.appendRow(BIOSAFETY_RESULT_HEADERS);
    sheet.getRange(1, 1, 1, BIOSAFETY_RESULT_HEADERS.length).setFontWeight('bold').setBackground('#dcfce7');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, BIOSAFETY_RESULT_HEADERS.length);
  }
  return sheet;
}

function getBiosafetyDefaultPeriod_() {
  return String(new Date().getFullYear());
}

function normalizeBiosafetyPeriod_(period) {
  return String(period || getBiosafetyDefaultPeriod_()).trim() || getBiosafetyDefaultPeriod_();
}

function normalizeBiosafetyResult_(value) {
  const key = foldText_(value);
  if (['dat', 'pass', '1', 'yes'].includes(key)) return 'Đạt';
  if (['khong dat', 'fail', '0', 'no'].includes(key)) return 'Không đạt';
  if (['khong ap dung', 'na', 'n/a', 'kad'].includes(key)) return 'Không áp dụng';
  return BIOSAFETY_RESULTS.includes(String(value || '').trim()) ? String(value || '').trim() : '';
}

function buildBiosafetyItemId_(rowNumber, chapter, section, content) {
  const seed = [rowNumber, chapter, section, content].join('|');
  return 'ATSH_' + sha256Hex_(seed).slice(0, 12);
}

function buildBiosafetyMasterRows_(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(header => String(header || '').trim());
  let idxChapter = findHeaderIndex_(headers, ['CHƯƠNG', 'CHUONG', 'Chapter']);
  let idxSection = findHeaderIndex_(headers, ['Mục', 'Muc', 'Nhóm', 'Nhom', 'Section']);
  let idxContent = findHeaderIndex_(headers, ['Nội dung 1', 'Noi dung 1', 'Nội dung', 'Noi dung', 'Tiêu chí', 'Tieu chi']);
  let idxGuidance = findHeaderIndex_(headers, ['Ghi chú', 'Ghi chu', 'Hướng dẫn', 'Huong dan']);
  if (idxChapter === -1 && idxSection === -1 && idxContent === -1 && headers.length >= 4) {
    idxChapter = 0;
    idxSection = 1;
    idxContent = 2;
    idxGuidance = 3;
  }
  const idxActive = findHeaderIndex_(headers, ['Active', 'Trang thai', 'Trạng thái']);
  return values.slice(1).map((row, index) => {
    const rowNumber = index + 2;
    const chapter = getCellByHeader_(row, idxChapter);
    const section = getCellByHeader_(row, idxSection);
    const content = getCellByHeader_(row, idxContent);
    const guidance = getCellByHeader_(row, idxGuidance);
    const activeValue = getCellByHeader_(row, idxActive);
    const active = idxActive === -1 ? true : isConfigRowActive_(activeValue);
    return {
      itemId: buildBiosafetyItemId_(rowNumber, chapter, section, content || guidance),
      rowNumber: rowNumber,
      chapter: chapter || 'Bảng kiểm',
      section: section,
      content: content,
      guidance: guidance,
      active: active
    };
  }).filter(item => item.active && (item.content || item.guidance || item.section));
}

function getBiosafetyMasterItems_() {
  return getCachedJson_(CACHE_SCOPE_SETTINGS, 'biosafetyMasterItems', CACHE_TTL_CONFIG_SECONDS, () => {
    const sheet = getBiosafetyMasterSheet_();
    if (!sheet) return [];
    return buildBiosafetyMasterRows_(sheet.getDataRange().getValues());
  });
}

function buildBiosafetyFormId_(deptName, period) {
  return 'ATSH_' + sha256Hex_(foldText_(deptName) + '|' + normalizeBiosafetyPeriod_(period)).slice(0, 16);
}

function findBiosafetyResultRow_(sheet, deptName, period) {
  const targetId = buildBiosafetyFormId_(deptName, period);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, BIOSAFETY_RESULT_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') === targetId) return { rowNumber: i + 2, row: values[i] };
  }
  return null;
}

function parseBiosafetyResultJson_(jsonText) {
  if (!jsonText) return { items: {} };
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed && parsed.items && typeof parsed.items === 'object') return parsed;
  } catch (e) {}
  return { items: {} };
}

function mergeBiosafetyRows_(masterItems, resultJson) {
  const resultItems = resultJson && resultJson.items ? resultJson.items : {};
  return masterItems.map(item => {
    const saved = resultItems[item.itemId] || {};
    return Object.assign({}, item, {
      khoaResult: normalizeBiosafetyResult_(saved.khoaResult),
      khoaNote: String(saved.khoaNote || ''),
      doanResult: normalizeBiosafetyResult_(saved.doanResult),
      doanNote: String(saved.doanNote || '')
    });
  });
}

function summarizeBiosafetyRows_(rows) {
  const summary = {
    total: rows.length,
    khoaDone: 0,
    doanDone: 0,
    khoaPass: 0,
    doanPass: 0,
    khoaFail: 0,
    doanFail: 0,
    attention: []
  };
  rows.forEach(row => {
    if (row.khoaResult) summary.khoaDone++;
    if (row.doanResult) summary.doanDone++;
    if (row.khoaResult === 'Đạt') summary.khoaPass++;
    if (row.doanResult === 'Đạt') summary.doanPass++;
    if (row.khoaResult === 'Không đạt') summary.khoaFail++;
    if (row.doanResult === 'Không đạt') summary.doanFail++;
    if (row.khoaResult === 'Không đạt' || row.doanResult === 'Không đạt') summary.attention.push(row);
  });
  summary.khoaPercent = summary.total ? Math.round((summary.khoaDone / summary.total) * 100) : 0;
  summary.doanPercent = summary.total ? Math.round((summary.doanDone / summary.total) * 100) : 0;
  return summary;
}

function getBiosafetyDepartments(sessionToken) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;
    return okResponse_({
      departments: getBiosafetyDepartments_(auth.user).map(dept => ({ code: dept.code, name: dept.name })),
      period: getBiosafetyDefaultPeriod_(),
      mode: getBiosafetyModeForUser_(auth.user),
      canWrite: userHasRole_(auth.user, 'Khoa') || userHasRole_(auth.user, 'DoanXN') || userHasRole_(auth.user, 'Admin')
    });
  } catch (e) {
    return failResponse_('Lỗi tải danh sách khoa xét nghiệm ATSH: ' + e.message);
  }
}

function getBiosafetyChecklist(sessionToken, deptName, period) {
  try {
    const auth = requireBiosafetyAccess_(sessionToken, deptName, false);
    if (!auth.success) return auth;
    const dept = getBiosafetyDepartmentByName_(deptName);
    const normalizedPeriod = normalizeBiosafetyPeriod_(period);
    const masterItems = getBiosafetyMasterItems_();
    if (!masterItems.length) {
      return failResponse_('Chưa tìm thấy dữ liệu master ATSH. Hãy tạo sheet ATSH_Master hoặc nhập sheet BK ATSH - Sheet1 vào spreadsheet.');
    }
    const sheet = getBiosafetyResultSheet_();
    const match = findBiosafetyResultRow_(sheet, dept.name, normalizedPeriod);
    const resultJson = parseBiosafetyResultJson_(match && match.row ? match.row[6] : '');
    const rows = mergeBiosafetyRows_(masterItems, resultJson);
    return okResponse_({
      deptName: dept.name,
      period: normalizedPeriod,
      rows: rows,
      summary: summarizeBiosafetyRows_(rows),
      mode: getBiosafetyModeForUser_(auth.user),
      canWrite: userHasRole_(auth.user, 'Khoa') || userHasRole_(auth.user, 'DoanXN') || userHasRole_(auth.user, 'Admin'),
      updatedAt: match && match.row ? formatDateTimeForClient_(match.row[4]) : ''
    });
  } catch (e) {
    return failResponse_('Lỗi tải bảng kiểm an toàn sinh học: ' + e.message);
  }
}

function saveBiosafetyEvaluation(sessionToken, deptName, period, role, formData) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    const auth = requireBiosafetyAccess_(sessionToken, deptName, true);
    if (!auth.success) return auth;
    const dept = getBiosafetyDepartmentByName_(deptName);
    const userMode = getBiosafetyModeForUser_(auth.user);
    const saveRole = userMode === 'admin' ? (role || 'khoa') : userMode;
    if (!['khoa', 'doan_kiem_tra'].includes(saveRole)) return forbiddenResponse_('Vai trò hiện tại không được lưu bảng kiểm an toàn sinh học.');

    lock.waitLock(15000);
    lockAcquired = true;

    const normalizedPeriod = normalizeBiosafetyPeriod_(period);
    const masterItems = getBiosafetyMasterItems_();
    if (!masterItems.length) return failResponse_('Chưa có dữ liệu master ATSH để lưu.');
    const masterMap = {};
    masterItems.forEach(item => { masterMap[item.itemId] = true; });

    const sheet = getBiosafetyResultSheet_();
    const match = findBiosafetyResultRow_(sheet, dept.name, normalizedPeriod);
    const resultJson = parseBiosafetyResultJson_(match && match.row ? match.row[6] : '');
    resultJson.items = resultJson.items || {};

    (Array.isArray(formData) ? formData : []).forEach(item => {
      const itemId = String(item.itemId || '');
      if (!masterMap[itemId]) return;
      const saved = resultJson.items[itemId] || {};
      if (saveRole === 'doan_kiem_tra') {
        saved.doanResult = normalizeBiosafetyResult_(item.ketQua);
        saved.doanNote = String(item.ghiChu || '');
      } else {
        saved.khoaResult = normalizeBiosafetyResult_(item.ketQua);
        saved.khoaNote = String(item.ghiChu || '');
      }
      resultJson.items[itemId] = saved;
    });
    resultJson.updatedBy = auth.user.username || auth.user.name || '';
    resultJson.updatedAt = new Date().toISOString();

    const rowValues = [
      buildBiosafetyFormId_(dept.name, normalizedPeriod),
      normalizedPeriod,
      dept.name,
      'Đang đánh giá',
      new Date(),
      auth.user.username || auth.user.name || '',
      JSON.stringify(resultJson)
    ];
    if (match && match.rowNumber) {
      sheet.getRange(match.rowNumber, 1, 1, BIOSAFETY_RESULT_HEADERS.length).setValues([rowValues]);
    } else {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, BIOSAFETY_RESULT_HEADERS.length).setValues([rowValues]);
    }
    SpreadsheetApp.flush();
    logAudit_(auth.user, 'BIOSAFETY_SAVE', dept.name + ' / ' + normalizedPeriod, { role: saveRole, rows: Array.isArray(formData) ? formData.length : 0 });
    return okResponse_(null, { message: 'Đã lưu bảng kiểm an toàn sinh học cho ' + dept.name + ' - kỳ ' + normalizedPeriod + '.' });
  } catch (e) {
    return failResponse_('Lỗi lưu bảng kiểm an toàn sinh học: ' + e.message);
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function getBiosafetyReport(sessionToken, deptName, period) {
  try {
    const checklist = getBiosafetyChecklist(sessionToken, deptName, period);
    if (!checklist.success) return checklist;
    return okResponse_({
      deptName: checklist.data.deptName,
      period: checklist.data.period,
      summary: checklist.data.summary,
      attention: checklist.data.summary.attention
    });
  } catch (e) {
    return failResponse_('Lỗi tải báo cáo an toàn sinh học: ' + e.message);
  }
}
