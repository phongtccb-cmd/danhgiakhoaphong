/**
 * 055_Lab2429.js
 * Laboratory checklist 2429 data and evaluation services.
 */

const LAB2429_TEMPLATE_SHEET_NAME = 'BangKiem_FlatData';
const LAB2429_DEPARTMENTS = [
  { code: 'XN_SH', name: 'Khoa Sinh Hóa', aliases: ['Sinh Hóa', 'Sinh Hoa', 'Khoa Sinh Hoa'] },
  { code: 'XN_HHTM', name: 'Khoa Huyết học truyền máu', aliases: ['Huyết học', 'Huyet hoc', 'Huyết học truyền máu', 'Huyet hoc truyen mau', 'Khoa Huyet hoc truyen mau'] },
  { code: 'XN_VS', name: 'Khoa Vi sinh', aliases: ['Vi sinh', 'Khoa Vi sinh'] },
  { code: 'XN_GPB', name: 'Khoa Giải phẫu bệnh', aliases: ['Giải phẫu bệnh', 'Giai phau benh', 'Khoa Giai phau benh'] }
];

function getLab2429DepartmentByName_(name) {
  const key = foldText_(name);
  return LAB2429_DEPARTMENTS.find(dept => {
    if (foldText_(dept.name) === key || foldText_(dept.code) === key) return true;
    return dept.aliases.some(alias => foldText_(alias) === key);
  }) || null;
}

function getLab2429SheetName_(deptName) {
  const dept = getLab2429DepartmentByName_(deptName);
  return dept ? 'KQ_' + dept.name : '';
}

function userCanAccessLab2429Dept_(user, deptName) {
  if (!user) return false;
  if (userHasRole_(user, 'Admin') || userHasRole_(user, 'TruongNhom') || userHasRole_(user, 'ThuKi') || userHasRole_(user, 'DoanXN')) return true;
  const dept = getLab2429DepartmentByName_(deptName);
  if (!dept) return false;
  const accessList = Array.isArray(user.quyenTruyCap) ? user.quyenTruyCap : [];
  if (accessList.some(isAllAccessValue_)) return true;
  return accessList.some(item => {
    const itemKey = foldText_(item);
    if (itemKey === foldText_(dept.name) || itemKey === foldText_(dept.code)) return true;
    return dept.aliases.some(alias => foldText_(alias) === itemKey);
  });
}

function getAllowedLab2429Departments_(user) {
  if (user && (userHasRole_(user, 'Admin') || userHasRole_(user, 'TruongNhom') || userHasRole_(user, 'ThuKi') || userHasRole_(user, 'DoanXN'))) return LAB2429_DEPARTMENTS;
  return LAB2429_DEPARTMENTS.filter(dept => userCanAccessLab2429Dept_(user, dept.name));
}

function getLab2429ModeForUser_(user) {
  if (!user) return 'readonly';
  if (userHasRole_(user, 'Admin')) return 'admin';
  if (userHasRole_(user, 'DoanXN')) return 'doan_kiem_tra';
  if (userHasRole_(user, 'Khoa')) return 'khoa';
  return 'readonly';
}

function requireLab2429Access_(sessionToken, deptName, writeMode) {
  const auth = requireSession_(sessionToken);
  if (!auth.success) return auth;
  if (!getLab2429DepartmentByName_(deptName)) {
    return { success: false, message: 'Không tìm thấy khoa xét nghiệm: ' + String(deptName || '') };
  }
  if (!userCanAccessLab2429Dept_(auth.user, deptName)) {
    return forbiddenResponse_('Bạn không có quyền truy cập bảng kiểm xét nghiệm của khoa: ' + String(deptName || ''));
  }
  if (writeMode && !(userHasRole_(auth.user, 'Khoa') || userHasRole_(auth.user, 'DoanXN') || userHasRole_(auth.user, 'Admin'))) {
    return forbiddenResponse_('Vai trò hiện tại chỉ được xem báo cáo xét nghiệm 2429.');
  }
  return auth;
}

function getLab2429Sheet_(deptName, createIfMissing) {
  const dept = getLab2429DepartmentByName_(deptName);
  if (!dept) throw new Error('Khoa xét nghiệm không hợp lệ.');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = getLab2429SheetName_(dept.name);
  let sheet = ss.getSheetByName(sheetName);
  if (sheet || !createIfMissing) return sheet;

  const template = ss.getSheetByName(LAB2429_TEMPLATE_SHEET_NAME);
  if (!template) throw new Error('Không tìm thấy sheet template ' + LAB2429_TEMPLATE_SHEET_NAME + '.');
  sheet = template.copyTo(ss);
  sheet.setName(sheetName);
  return sheet;
}

function ensureLab2429Sheet_(deptName) {
  return getLab2429Sheet_(deptName, true);
}

function getLab2429DisplayData_(deptName) {
  const sheet = getLab2429Sheet_(deptName, false);
  if (sheet) return sheet.getDataRange().getDisplayValues();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const template = ss.getSheetByName(LAB2429_TEMPLATE_SHEET_NAME);
  if (!template) throw new Error('Không tìm thấy sheet template ' + LAB2429_TEMPLATE_SHEET_NAME + '.');
  return template.getDataRange().getDisplayValues();
}

function getLab2429ColumnsForRole_(role) {
  const isDoan = role === 'doan_kiem_tra';
  return {
    result: isDoan ? 8 : 4,
    note: isDoan ? 9 : 6,
    score: isDoan ? 10 : 7,
    otherResult: isDoan ? 4 : 8
  };
}

function normalizeLab2429Result_(value) {
  const key = foldText_(value);
  if (['dat', 'pass', '1'].includes(key)) return 'Đạt';
  if (['dat mot phan', 'dat 1 phan', 'partial', '0.5'].includes(key)) return 'Đạt một phần';
  if (['khong dat', 'fail', '0'].includes(key)) return 'Không đạt';
  if (['khong ap dung', 'na', 'n/a', 'kad'].includes(key)) return 'Không áp dụng';
  return String(value || '').trim();
}

function parseLab2429Code_(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d+\.\d+(?:\.[a-zA-Z])?)/);
  return match ? match[1] : raw;
}

function buildLab2429Rows_(displayData) {
  return displayData.slice(1).map((row, index) => ({
    rowIndex: index + 1,
    chapter: String(row[0] || '').trim(),
    group: String(row[1] || '').trim(),
    code: String(row[2] || '').trim(),
    cleanCode: parseLab2429Code_(row[2]),
    content: String(row[3] || '').trim(),
    khoaResult: String(row[4] || '').trim(),
    standardScore: String(row[5] || '').trim(),
    khoaNote: String(row[6] || '').trim(),
    khoaScore: String(row[7] || '').trim(),
    doanResult: String(row[8] || '').trim(),
    doanNote: String(row[9] || '').trim(),
    doanScore: String(row[10] || '').trim()
  })).filter(row => row.code || row.content);
}

function calculateLab2429ParentAndScores_(data, displayData, role) {
  const cols = getLab2429ColumnsForRole_(role);
  const targetColCount = Math.max(data[0].length, 11);
  for (let r = 0; r < data.length; r++) while (data[r].length < targetColCount) data[r].push('');
  data[0][4] = 'KQ (Khoa)';
  data[0][6] = 'Ghi chú (Khoa)';
  data[0][7] = 'Điểm (Khoa)';
  data[0][8] = 'KQ (Đoàn KT)';
  data[0][9] = 'Ghi chú (Đoàn KT)';
  data[0][10] = 'Điểm (Đoàn KT)';

  const parents = {};
  for (let r = 1; r < data.length; r++) {
    const cleanCode = parseLab2429Code_(displayData[r] && displayData[r][2]);
    const mainMatch = cleanCode.match(/^(\d+\.\d+)$/);
    const subMatch = cleanCode.match(/^(\d+\.\d+)\.([a-zA-Z])$/);
    if (mainMatch) parents[cleanCode] = { index: r, children: [] };
    else if (subMatch && parents[subMatch[1]]) parents[subMatch[1]].children.push(r);
  }

  Object.keys(parents).forEach(code => {
    const parent = parents[code];
    if (!parent.children.length) return;
    let passedScore = 0;
    let notAppCount = 0;
    let gradedCount = 0;
    parent.children.forEach(childRow => {
      const childResult = normalizeLab2429Result_(data[childRow][cols.result]);
      if (childResult === 'Đạt') {
        passedScore += 1;
        gradedCount++;
      } else if (childResult === 'Đạt một phần') {
        passedScore += 0.5;
        gradedCount++;
      } else if (childResult === 'Không đạt') {
        gradedCount++;
      } else if (childResult === 'Không áp dụng') {
        notAppCount++;
        gradedCount++;
      }
    });
    const validSub = parent.children.length - notAppCount;
    if (gradedCount === parent.children.length && gradedCount > 0) {
      if (validSub === 0 && notAppCount > 0) data[parent.index][cols.result] = 'Không áp dụng';
      else if (validSub > 0) {
        const ratio = passedScore / validSub;
        data[parent.index][cols.result] = ratio === 1 ? 'Đạt' : (ratio >= 0.5 ? 'Đạt một phần' : 'Không đạt');
      }
    } else {
      data[parent.index][cols.result] = '';
    }
  });

  for (let r = 1; r < data.length; r++) {
    const result = normalizeLab2429Result_(data[r][cols.result]);
    const standardRaw = data[r][5] ? String(data[r][5]) : '';
    let score = '';
    if (standardRaw !== '') {
      const standardScore = parseFloat(standardRaw.replace(',', '.'));
      if (!isNaN(standardScore)) {
        if (result === 'Đạt') score = standardScore;
        else if (result === 'Đạt một phần') score = standardScore / 2;
        else if (result === 'Không đạt') score = 0;
      }
    }
    data[r][cols.score] = score;
  }
}

function getLab2429Departments(sessionToken) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;
    return {
      success: true,
      data: {
        departments: getAllowedLab2429Departments_(auth.user).map(dept => ({ code: dept.code, name: dept.name })),
        mode: getLab2429ModeForUser_(auth.user),
        canWrite: userHasRole_(auth.user, 'Khoa') || userHasRole_(auth.user, 'DoanXN') || userHasRole_(auth.user, 'Admin')
      }
    };
  } catch (e) {
    return { success: false, message: 'Lỗi tải danh sách khoa xét nghiệm: ' + e.message };
  }
}

function getLab2429Checklist(sessionToken, deptName) {
  try {
    const auth = requireLab2429Access_(sessionToken, deptName, false);
    if (!auth.success) return auth;
    const dept = getLab2429DepartmentByName_(deptName);
    const displayData = getLab2429DisplayData_(dept.name);
    return {
      success: true,
      data: {
        deptName: dept.name,
        headers: displayData[0] || [],
        rows: buildLab2429Rows_(displayData),
        mode: getLab2429ModeForUser_(auth.user),
        canWrite: userHasRole_(auth.user, 'Khoa') || userHasRole_(auth.user, 'DoanXN') || userHasRole_(auth.user, 'Admin')
      }
    };
  } catch (e) {
    return { success: false, message: 'Lỗi tải bảng kiểm xét nghiệm 2429: ' + e.message };
  }
}

function saveLab2429Evaluation(sessionToken, deptName, role, formData) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    const auth = requireLab2429Access_(sessionToken, deptName, true);
    if (!auth.success) return auth;
    const dept = getLab2429DepartmentByName_(deptName);
    const userMode = getLab2429ModeForUser_(auth.user);
    const saveRole = userMode === 'admin' ? (role || 'khoa') : userMode;
    if (!['khoa', 'doan_kiem_tra'].includes(saveRole)) return forbiddenResponse_('Vai trò hiện tại không được lưu bảng kiểm xét nghiệm 2429.');

    lock.waitLock(15000);
    lockAcquired = true;

    const sheet = ensureLab2429Sheet_(dept.name);
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    const displayData = dataRange.getDisplayValues();
    const cols = getLab2429ColumnsForRole_(saveRole);
    (Array.isArray(formData) ? formData : []).forEach(item => {
      const rowIndex = Number(item.rowIndex);
      if (rowIndex > 0 && rowIndex < data.length) {
        data[rowIndex][cols.result] = normalizeLab2429Result_(item.ketQua);
        data[rowIndex][cols.note] = String(item.ghiChu || '');
      }
    });
    calculateLab2429ParentAndScores_(data, displayData, saveRole);
    sheet.getRange(1, cols.result + 1, data.length, 1).setValues(data.map(row => [row[cols.result]]));
    sheet.getRange(1, cols.note + 1, data.length, 1).setValues(data.map(row => [row[cols.note]]));
    sheet.getRange(1, cols.score + 1, data.length, 1).setValues(data.map(row => [row[cols.score]]));
    SpreadsheetApp.flush();
    logAudit_(auth.user, 'LAB2429_SAVE', dept.name, { role: saveRole, rows: Array.isArray(formData) ? formData.length : 0 });
    return { success: true, message: 'Đã lưu kết quả bảng kiểm xét nghiệm 2429 cho ' + dept.name + '.' };
  } catch (e) {
    return { success: false, message: 'Lỗi lưu bảng kiểm xét nghiệm 2429: ' + e.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function getLab2429Report(sessionToken, deptName) {
  try {
    const auth = requireLab2429Access_(sessionToken, deptName, false);
    if (!auth.success) return auth;
    const dept = getLab2429DepartmentByName_(deptName);
    const rows = buildLab2429Rows_(getLab2429DisplayData_(dept.name));
    const summary = { deptName: dept.name, totalRows: rows.length, totalStandard: 0, khoaScore: 0, doanScore: 0, khoaMissing: 0, doanMissing: 0, partialOrFail: [] };
    rows.forEach(row => {
      const standard = parseFloat(String(row.standardScore || '').replace(',', '.'));
      if (!isNaN(standard)) summary.totalStandard += standard;
      const khoaScore = parseFloat(String(row.khoaScore || '').replace(',', '.'));
      if (!isNaN(khoaScore)) summary.khoaScore += khoaScore;
      const doanScore = parseFloat(String(row.doanScore || '').replace(',', '.'));
      if (!isNaN(doanScore)) summary.doanScore += doanScore;
      if (!row.khoaResult) summary.khoaMissing++;
      if (!row.doanResult) summary.doanMissing++;
      if (['Đạt một phần', 'Không đạt'].includes(row.khoaResult) || ['Đạt một phần', 'Không đạt'].includes(row.doanResult)) summary.partialOrFail.push(row);
    });
    summary.scoreGap = summary.doanScore - summary.khoaScore;
    return { success: true, data: summary };
  } catch (e) {
    return { success: false, message: 'Lỗi tải báo cáo xét nghiệm 2429: ' + e.message };
  }
}
