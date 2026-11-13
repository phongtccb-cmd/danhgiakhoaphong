/**
 * 086_DataJsonNormalize.js
 * Safe migration helpers for normalizing Data_JSON after schema changes.
 *
 * Rules:
 * - Stored item Khoa score: diemtc_bv.
 * - Stored item Doan score: diemtc_doan.
 * - Root scores are derived values: diemtc, diemtc_doan.
 * - Legacy item `diem` is restored to Doan score for confirmed Doan-scored prefixes.
 * - For other prefixes, legacy item `diem` is restored to Khoa score when explicit Khoa fields are missing.
 */

const DATA_JSON_NORMALIZE_REPORT_SHEET = 'Normalize_Data_JSON_Report';
const DATA_JSON_LEGACY_DIEM_TO_DOAN_PREFIXES = ['LNMM', 'CTCH', 'TMH', 'RHM', 'CĐHA', 'TDCN', 'KDD', 'KKB', 'KTT'];

function normalizeDataJsonStructureDryRun() {
  return normalizeDataJsonStructure_({ apply: false, createBackup: false });
}

function normalizeDataJsonStructureApply() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Chuan hoa Data_JSON',
    'Script se tao backup sheet roi cap nhat cot C, D va H cua Data_JSON. Tiep tuc?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) {
    ui.alert('Da huy chuan hoa Data_JSON.');
    return { success: false, message: 'Cancelled by user.' };
  }
  return normalizeDataJsonStructure_({ apply: true, createBackup: true });
}

function normalizeDataJsonStructure_(options) {
  const opts = options || {};
  const startedAt = new Date();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getDbSheet_();
  const lastRow = sheet.getLastRow();
  const result = {
    success: true,
    apply: opts.apply === true,
    totalRows: Math.max(0, lastRow - 1),
    changedRows: 0,
    parseErrors: 0,
    mcParseErrors: 0,
    missingItemArrays: 0,
    itemMissingInheritedRows: 0,
    duplicateItemArrays: 0,
    duplicateArraysMismatch: 0,
    rowsWithKhoaScore: 0,
    rowsWithDoanScore: 0,
    riskyDiemEqualsDiemtcRows: 0,
    legacyDiemRestoredToKhoaRows: 0,
    legacyDiemRestoredToKhoaItems: 0,
    legacyDiemRestoredToDoanRows: 0,
    legacyDiemRestoredToDoanItems: 0,
    rootKhoaScoreFixed: 0,
    rootDoanScoreFixed: 0,
    compactedStorageRows: 0,
    mcOrphanItems: 0,
    backupSheetName: '',
    reportSheetName: DATA_JSON_NORMALIZE_REPORT_SHEET,
    checkedAt: formatDateTimeForClient_(startedAt)
  };

  if (lastRow < 2) {
    writeNormalizeReport_(ss, result, []);
    SpreadsheetApp.getUi().alert('Data_JSON dang rong.');
    return result;
  }

  const criteriaDict = getCriteriaMetadataDict_(ss);
  const departments = getDepartmentsForList_();
  const saveScoreRoleMap = buildSaveScoreRoleMap_(ss);
  const range = sheet.getRange(2, 1, lastRow - 1, 8);
  const values = range.getValues();
  const outputCtoH = values.map(row => row.slice(2, 8));
  const reportRows = [];

  values.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowId = String(row[0] || '').trim();
    const rowMaGop = String(row[1] || '').trim();
    const jsonText = row[2];
    const statusText = row[3];
    const evidenceText = row[7];
    const issues = [];
    let changed = false;
    let normalizedJsonText = jsonText;
    let normalizedStatusText = statusText;
    let normalizedEvidenceText = evidenceText;

    if (!jsonText) {
      result.parseErrors += 1;
      issues.push('missing_json');
      reportRows.push(buildNormalizeReportRow_(rowNumber, rowId, rowMaGop, issues, false));
      return;
    }

    try {
      const originalObj = JSON.parse(jsonText);
      const normalized = normalizeDataJsonObject_(originalObj, {
        rowId: rowId,
        rowMaGop: rowMaGop,
        rowKhoa: row[6],
        criteriaDict: criteriaDict,
        departments: departments,
        saveScoreRoleMap: saveScoreRoleMap
      });
      const mcResult = normalizeMcJsonForDataJson_(evidenceText, rowId, normalized.itemIds);
      const nextJsonText = JSON.stringify(normalized.obj);
      const nextEvidenceText = JSON.stringify(mcResult.obj);

      Array.prototype.push.apply(issues, normalized.issues);
      Array.prototype.push.apply(issues, mcResult.issues);

      result.duplicateItemArrays += normalized.stats.duplicateItemArrays ? 1 : 0;
      result.duplicateArraysMismatch += normalized.stats.duplicateArraysMismatch ? 1 : 0;
      result.itemMissingInheritedRows += normalized.stats.itemMissingInherited ? 1 : 0;
      result.missingItemArrays += normalized.stats.missingItemArray ? 1 : 0;
      result.rowsWithKhoaScore += normalized.stats.hasKhoaScore ? 1 : 0;
      result.rowsWithDoanScore += normalized.stats.hasDoanScore ? 1 : 0;
      result.riskyDiemEqualsDiemtcRows += normalized.stats.riskyDiemEqualsDiemtc ? 1 : 0;
      result.legacyDiemRestoredToKhoaRows += normalized.stats.legacyDiemRestoredToKhoa ? 1 : 0;
      result.legacyDiemRestoredToKhoaItems += normalized.stats.legacyDiemRestoredToKhoaItems || 0;
      result.legacyDiemRestoredToDoanRows += normalized.stats.legacyDiemRestoredToDoan ? 1 : 0;
      result.legacyDiemRestoredToDoanItems += normalized.stats.legacyDiemRestoredToDoanItems || 0;
      result.rootKhoaScoreFixed += normalized.stats.rootKhoaScoreFixed ? 1 : 0;
      result.rootDoanScoreFixed += normalized.stats.rootDoanScoreFixed ? 1 : 0;
      result.compactedStorageRows += normalized.stats.compactedStorage ? 1 : 0;
      result.mcParseErrors += mcResult.stats.parseError ? 1 : 0;
      result.mcOrphanItems += mcResult.stats.orphanItems || 0;

      if (nextJsonText !== String(jsonText || '')) {
        normalizedJsonText = nextJsonText;
        changed = true;
      }
      if (nextEvidenceText !== String(evidenceText || '')) {
        normalizedEvidenceText = nextEvidenceText;
        changed = true;
      }
      if (String(normalized.status || '') !== String(statusText || '')) {
        normalizedStatusText = normalized.status;
        changed = true;
      }

      if (changed) {
        result.changedRows += 1;
        outputCtoH[index][0] = normalizedJsonText;
        outputCtoH[index][1] = normalizedStatusText;
        outputCtoH[index][5] = normalizedEvidenceText;
      }

      if (issues.length || changed) {
        reportRows.push(buildNormalizeReportRow_(rowNumber, rowId, rowMaGop, issues, changed));
      }
    } catch (e) {
      result.parseErrors += 1;
      issues.push('json_error:' + e.message);
      reportRows.push(buildNormalizeReportRow_(rowNumber, rowId, rowMaGop, issues, false));
    }
  });

  if (opts.apply === true && result.changedRows > 0) {
    if (opts.createBackup !== false) {
      result.backupSheetName = backupDataJsonSheet_(ss, sheet);
    }
    sheet.getRange(2, 3, outputCtoH.length, 6).setValues(outputCtoH);
    SpreadsheetApp.flush();
    invalidateAppCache_(CACHE_SCOPE_DATA);
    invalidateAppCache_(CACHE_SCOPE_DASHBOARD);
    invalidateAppCache_(CACHE_SCOPE_ROW_INDEX);
  }

  writeNormalizeReport_(ss, result, reportRows);
  logAudit_('system', opts.apply === true ? 'DATA_JSON_NORMALIZE_APPLY' : 'DATA_JSON_NORMALIZE_DRYRUN', SHEET_NAME, result);
  SpreadsheetApp.getUi().alert(
    (opts.apply === true ? 'Da chuan hoa Data_JSON.' : 'Da dry-run chuan hoa Data_JSON.') +
    '\nTong dong: ' + result.totalRows +
    '\nDong se/da sua: ' + result.changedRows +
    '\nLoi JSON: ' + result.parseErrors +
    '\nReport: ' + DATA_JSON_NORMALIZE_REPORT_SHEET +
    (result.backupSheetName ? '\nBackup: ' + result.backupSheetName : '')
  );
  return result;
}

function normalizeDataJsonObject_(sourceObj, context) {
  const ctx = context || {};
  const obj = JSON.parse(JSON.stringify(sourceObj || {}));
  const legacyDiemByItemId = buildLegacyDiemByItemId_(getAllCriteriaItemsForLegacy_(obj));
  const issues = [];
  const stats = {
    duplicateItemArrays: false,
    duplicateArraysMismatch: false,
    itemMissingInherited: false,
    missingItemArray: false,
    hasKhoaScore: false,
    hasDoanScore: false,
    riskyDiemEqualsDiemtc: false,
    legacyDiemRestoredToKhoa: false,
    legacyDiemRestoredToKhoaItems: 0,
    legacyDiemRestoredToDoan: false,
    legacyDiemRestoredToDoanItems: 0,
    rootKhoaScoreFixed: false,
    rootDoanScoreFixed: false,
    compactedStorage: false
  };

  if (!obj.ID_ketqua) obj.ID_ketqua = ctx.rowId || '';
  if (!obj.magop) obj.magop = ctx.rowMaGop || '';

  const effectiveMaGop = getEffectiveMaGop_(ctx.rowMaGop, obj);
  let normalizedObj = applyCriteriaSettings_(
    normalizeCriteriaObject_(obj),
    ctx.criteriaDict,
    effectiveMaGop
  );

  if (!normalizedObj.phong) {
    const dept = resolveDepartmentFromMaGop_(effectiveMaGop, ctx.departments || []);
    normalizedObj.phong = String((dept && dept.name) || ctx.rowKhoa || '').trim();
  }

  const hasChiTiet = Array.isArray(normalizedObj.ChiTiet);
  const hasDanhSach = Array.isArray(normalizedObj.danh_sach_muc_do) || Array.isArray(normalizedObj.danhSachMucDo);
  let items = getCriteriaItems_(normalizedObj);
  if (!Array.isArray(items) || items.length === 0) {
    stats.missingItemArray = true;
    issues.push('missing_item_array');
    return {
      obj: normalizedObj,
      itemIds: [],
      status: String(sourceObj && sourceObj.TrangThai || ''),
      issues: issues,
      stats: stats
    };
  }

  if (hasChiTiet && hasDanhSach) {
    stats.duplicateItemArrays = true;
    const sourceList = Array.isArray(sourceObj.ChiTiet) ? sourceObj.ChiTiet : [];
    const altList = Array.isArray(sourceObj.danh_sach_muc_do) ? sourceObj.danh_sach_muc_do : (Array.isArray(sourceObj.danhSachMucDo) ? sourceObj.danhSachMucDo : []);
    const idsA = sourceList.map(item => String(item && item.id || '')).join('|');
    const idsB = altList.map(item => String(item && item.id || '')).join('|');
    if (sourceList.length !== altList.length || idsA !== idsB) {
      stats.duplicateArraysMismatch = true;
      issues.push('duplicate_arrays_mismatch');
    }
  }

  const legacyDiemTargetRole = getLegacyDiemTargetRole_(
    getEffectiveIdKetQua_(ctx.rowId, normalizedObj),
    getEffectiveMaGop_(ctx.rowMaGop, normalizedObj),
    ctx.saveScoreRoleMap
  );
  const normalizedItems = items.map(item => normalizeDataJsonItem_(item, normalizedObj, stats, {
    legacyDiemTargetRole: legacyDiemTargetRole,
    legacyDiem: legacyDiemByItemId[String(item && item.id || '')]
  }));
  const scoreReadyObj = normalizeCriteriaObject_(JSON.parse(JSON.stringify(Object.assign({}, normalizedObj, { ChiTiet: normalizedItems }))));
  const khoaScore = tinhDiemTieuChi_(scoreReadyObj.ChiTiet, 'bv');
  const doanScore = tinhDiemTieuChi_(scoreReadyObj.ChiTiet, 'doan');
  const originalRootKhoa = normalizedObj.diemtc;
  const originalRootDoan = normalizedObj.diemtc_doan;

  normalizedObj.ChiTiet = normalizedItems;
  normalizedObj.diemtc = khoaScore;
  normalizedObj.diemtc_doan = doanScore;

  stats.rootKhoaScoreFixed = String(originalRootKhoa === undefined || originalRootKhoa === null ? '' : originalRootKhoa) !== String(khoaScore);
  stats.rootDoanScoreFixed = String(originalRootDoan === undefined || originalRootDoan === null ? '' : originalRootDoan) !== String(doanScore);
  if (stats.rootKhoaScoreFixed) issues.push('root_khoa_score_fixed');
  if (stats.rootDoanScoreFixed) issues.push('root_doan_score_fixed');
  if (stats.itemMissingInherited) issues.push('item_missing_inherited_hydrated');
  if (stats.riskyDiemEqualsDiemtc) issues.push('risky_diem_equals_diemtc_ignored_as_doan');
  if (stats.legacyDiemRestoredToKhoa) issues.push('legacy_diem_restored_to_khoa:' + stats.legacyDiemRestoredToKhoaItems);
  if (stats.legacyDiemRestoredToDoan) issues.push('legacy_diem_restored_to_doan:' + stats.legacyDiemRestoredToDoanItems);

  const storageObj = dehydrateCriteriaForStorage_(normalizedObj);
  stats.compactedStorage = JSON.stringify(storageObj) !== JSON.stringify(sourceObj || {});

  return {
    obj: storageObj,
    itemIds: getCriteriaItems_(storageObj).map(item => String(item.id || '')).filter(Boolean),
    status: stats.hasDoanScore ? buildSaveStatusForRole_(normalizedItems, 'DoanKT') : buildSaveStatusForRole_(normalizedItems, 'Khoa'),
    issues: uniqueValues_(issues),
    stats: stats
  };
}

function normalizeDataJsonItem_(sourceItem, rootObj, stats, options) {
  const opts = options || {};
  const item = JSON.parse(JSON.stringify(sourceItem || {}));
  const inheritedFields = ['phong', 'nguoicham', 'nhomkt', 'magop', 'ID_ketqua'];
  inheritedFields.forEach(field => {
    if ((item[field] === undefined || item[field] === '') && rootObj[field] !== undefined) {
      stats.itemMissingInherited = true;
    }
  });

  let khoaScore = getItemKhoaScoreForStorage_(item);
  let doanScore = getItemDoanScoreForStorage_(item);
  const legacyDiem = firstNonBlankValue_([opts.legacyDiem, sourceItem && sourceItem.diem]);
  if (legacyDiem !== '' && opts.legacyDiemTargetRole === 'doan' && doanScore === '') {
    doanScore = String(legacyDiem);
    stats.legacyDiemRestoredToDoan = true;
    stats.legacyDiemRestoredToDoanItems += 1;
  } else if (khoaScore === '' && legacyDiem !== '') {
    khoaScore = String(legacyDiem);
    stats.legacyDiemRestoredToKhoa = true;
    stats.legacyDiemRestoredToKhoaItems += 1;
  }
  if (khoaScore !== '') {
    item.diemtc_bv = String(khoaScore);
    stats.hasKhoaScore = true;
  }
  if (doanScore !== '') {
    item.diemtc_doan = String(doanScore);
    stats.hasDoanScore = true;
  }
  if (item.diem !== undefined && item.diem !== '' && getItemKhoaScoreForStorage_(sourceItem) !== '' &&
      khoaScore !== '' &&
      String(item.diem) === String(khoaScore) &&
      (sourceItem.diem_doan === undefined || sourceItem.diem_doan === '') &&
      (sourceItem.diemtc_doan === undefined || sourceItem.diemtc_doan === '')) {
    stats.riskyDiemEqualsDiemtc = true;
  }
  return item;
}

function normalizeMcJsonForDataJson_(mcText, idKetQua, itemIds) {
  const issues = [];
  const stats = { parseError: false, orphanItems: 0, duplicateItems: 0 };
  let obj = { ID_ketqua: idKetQua || '', ChiTietMC: [] };

  if (mcText) {
    try {
      obj = JSON.parse(mcText);
    } catch (e) {
      stats.parseError = true;
      issues.push('mc_json_parse_error_rebuilt_empty');
    }
  }

  if (!obj || typeof obj !== 'object') obj = { ID_ketqua: idKetQua || '', ChiTietMC: [] };
  obj.ID_ketqua = obj.ID_ketqua || idKetQua || '';
  if (!Array.isArray(obj.ChiTietMC)) {
    obj.ChiTietMC = [];
    issues.push('mc_chitietmc_rebuilt');
  }

  const allowed = {};
  (itemIds || []).forEach(id => { allowed[String(id)] = true; });
  const seen = {};
  obj.ChiTietMC = obj.ChiTietMC
    .filter(item => {
      const id = String(item && item.id || '');
      if (!id) return false;
      if (!allowed[id]) {
        stats.orphanItems += 1;
        return true;
      }
      if (seen[id]) {
        stats.duplicateItems += 1;
        return false;
      }
      seen[id] = true;
      return true;
    })
    .map(item => {
      const mc = item || {};
      mc.id = String(mc.id || '');
      if (mc.minhchung_bv === undefined) mc.minhchung_bv = '';
      if (mc.minhchung_doan === undefined) mc.minhchung_doan = '';
      if (mc.evidences_bv !== undefined && !Array.isArray(mc.evidences_bv)) mc.evidences_bv = [];
      if (mc.evidences_doan !== undefined && !Array.isArray(mc.evidences_doan)) mc.evidences_doan = [];
      return mc;
    });

  if (stats.orphanItems) issues.push('mc_json_orphan_items_report_only:' + stats.orphanItems);
  if (stats.duplicateItems) issues.push('mc_json_duplicate_items_removed:' + stats.duplicateItems);

  return { obj: obj, issues: issues, stats: stats };
}

function firstNonBlankValue_(values) {
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function buildLegacyDiemByItemId_(items) {
  const result = {};
  (Array.isArray(items) ? items : []).forEach(item => {
    const id = String(item && item.id || '');
    if (!id) return;
    const legacyDiem = firstNonBlankValue_([item && item.diem]);
    if (legacyDiem !== '') result[id] = String(legacyDiem);
  });
  return result;
}

function getAllCriteriaItemsForLegacy_(criteriaObj) {
  const result = [];
  if (!criteriaObj || typeof criteriaObj !== 'object') return result;
  if (Array.isArray(criteriaObj.ChiTiet)) Array.prototype.push.apply(result, criteriaObj.ChiTiet);
  if (Array.isArray(criteriaObj.danh_sach_muc_do)) Array.prototype.push.apply(result, criteriaObj.danh_sach_muc_do);
  if (Array.isArray(criteriaObj.danhSachMucDo)) Array.prototype.push.apply(result, criteriaObj.danhSachMucDo);
  return result;
}

function getDataJsonIdPrefix_(idKetQua) {
  return String(idKetQua || '').trim().replace(/\d+$/, '');
}

function buildDataJsonRowKey_(idKetQua, maGop) {
  return String(idKetQua || '').trim() + '\u0001' + String(maGop || '').trim();
}

function buildSaveScoreRoleMap_(ss) {
  const result = { khoa: {}, doan: {} };
  try {
    const sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return result;

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), AUDIT_HEADERS.length)).getValues();
    values.forEach(row => {
      const action = String(row[3] || '').trim();
      if (action !== 'SAVE_SCORE') return;

      const details = parseAuditDetails_(row[5]);
      const idKetQua = String(details.id_ketqua || details.ID_ketqua || '').trim();
      const maGop = String(details.magop || '').trim();
      const role = String(details.role || row[2] || '').trim();
      if (!idKetQua || !maGop) return;

      const key = buildDataJsonRowKey_(idKetQua, maGop);
      if (role === 'Khoa') result.khoa[key] = true;
      if (role === 'DoanKT') result.doan[key] = true;
    });
  } catch (e) {
    return result;
  }
  return result;
}

function getLegacyDiemTargetRole_(idKetQua, maGop, saveScoreRoleMap) {
  const key = buildDataJsonRowKey_(idKetQua, maGop);
  const roleMap = saveScoreRoleMap || { khoa: {}, doan: {} };

  if (roleMap.khoa && roleMap.khoa[key]) return 'khoa';
  if (roleMap.doan && roleMap.doan[key]) return 'doan';

  const prefix = getDataJsonIdPrefix_(idKetQua);
  return DATA_JSON_LEGACY_DIEM_TO_DOAN_PREFIXES.indexOf(prefix) !== -1 ? 'doan' : 'khoa';
}

function buildNormalizeReportRow_(rowNumber, idKetQua, maGop, issues, changed) {
  return [
    new Date(),
    rowNumber,
    idKetQua || '',
    maGop || '',
    changed ? 'YES' : 'NO',
    (issues || []).join(', ')
  ];
}

function writeNormalizeReport_(ss, summary, rows) {
  let sheet = ss.getSheetByName(DATA_JSON_NORMALIZE_REPORT_SHEET);
  if (!sheet) sheet = ss.insertSheet(DATA_JSON_NORMALIZE_REPORT_SHEET);
  sheet.clear();
  const summaryRows = Object.keys(summary || {}).map(key => [key, summary[key]]);
  const output = [
    ['SUMMARY', ''],
    ...summaryRows,
    ['', ''],
    ['checked_at', formatDateTimeForClient_(new Date())],
    ['', ''],
    ['DETAILS', '', '', '', '', ''],
    ['Time', 'Row', 'ID_ketqua', 'magop', 'Changed', 'Issues']
  ];
  if (output.length) sheet.getRange(1, 1, output.length, 6).setValues(output.map(row => {
    const copy = row.slice();
    while (copy.length < 6) copy.push('');
    return copy;
  }));
  if (rows && rows.length) {
    sheet.getRange(output.length + 1, 1, rows.length, 6).setValues(rows);
  }
  sheet.setFrozenRows(1);
}

function backupDataJsonSheet_(ss, sourceSheet) {
  const name = 'Backup_Data_JSON_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const backup = sourceSheet.copyTo(ss);
  backup.setName(name);
  return name;
}
