/**
 * 050_Evaluation.js
 * Checklist data, evaluation details, and score saving.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function sanitizeUpdatedItemsForRole_(items, role) {
  return (Array.isArray(items) ? items : []).map(item => {
    const safeItem = { id: item.id };
    if (role === 'DoanKT') {
      if (item.diemtc_doan !== undefined) safeItem.diemtc_doan = item.diemtc_doan;
      if (item.minhchung_doan !== undefined) safeItem.minhchung_doan = item.minhchung_doan;
      if (Array.isArray(item.evidences_doan)) safeItem.evidences_doan = item.evidences_doan;
    } else {
      if (item.diemtc_bv !== undefined) safeItem.diemtc_bv = item.diemtc_bv;
      if (item.minhchung_bv !== undefined) safeItem.minhchung_bv = item.minhchung_bv;
      if (Array.isArray(item.evidences_bv)) safeItem.evidences_bv = item.evidences_bv;
    }
    return safeItem;
  });
}

function sanitizeEvidenceListForSave_(items) {
  return (Array.isArray(items) ? items : [])
    .map(item => ({
      id: String(item && item.id || ('ev_' + Date.now() + '_' + Math.floor(Math.random() * 100000))).slice(0, 80),
      title: String(item && item.title || '').trim().slice(0, 200),
      url: String(item && item.url || '').trim().slice(0, 1000),
      type: String(item && item.type || '').trim().slice(0, 40),
      note: String(item && item.note || '').trim().slice(0, 2000),
      uploadedBy: String(item && item.uploadedBy || '').trim().slice(0, 120),
      uploadedAt: String(item && item.uploadedAt || '').trim().slice(0, 40)
    }))
    .filter(item => item.title || item.url || item.note);
}

function buildSaveStatusForRole_(items, role) {
  const roleKey = role === 'DoanKT' ? 'doan' : 'bv';
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return 'Đang chấm dang dở';
  return countScoredItems_(list, roleKey) === list.length ? 'Đã hoàn thành phần việc' : 'Đang chấm dang dở';
}

function setChecklistScoreValueForRole_(item, role, value) {
  if (!item) return;
  const score = value === undefined || value === null ? '' : String(value);
  if (role === 'DoanKT') {
    item.diemtc_doan = score;
    return;
  }
  item.diemtc_bv = score;
}

function getDbSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Bổ sung thêm cột MC_JSON ở cột H (Cột 8)
    sheet.appendRow(['ID_ketqua', 'magop', 'Dữ liệu JSON', 'Trạng thái', 'Lần cập nhật cuối', 'Người chấm', 'Khoa/Phòng', 'MC_JSON']);
    sheet.getRange("A1:H1").setFontWeight("bold").setBackground("#d9ead3");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getCriteriaItems_(criteriaObj) {
  if (!criteriaObj) return [];
  if (Array.isArray(criteriaObj.ChiTiet)) return criteriaObj.ChiTiet;
  if (Array.isArray(criteriaObj.danh_sach_muc_do)) return criteriaObj.danh_sach_muc_do;
  if (Array.isArray(criteriaObj.danhSachMucDo)) return criteriaObj.danhSachMucDo;
  return [];
}

function getItemPhong_(item, rootObj) {
  return String((item && item.phong) || (rootObj && rootObj.phong) || '').trim();
}

function getItemNguoiCham_(item, rootObj) {
  return String((item && item.nguoicham) || (rootObj && rootObj.nguoicham) || '').trim();
}

function getItemNhomKt_(item, rootObj) {
  return String((item && item.nhomkt) || (rootObj && rootObj.nhomkt) || '').trim();
}

function getItemMaGop_(item, rootObj) {
  return String((item && item.magop) || (rootObj && rootObj.magop) || '').trim();
}

function getItemIdKetQua_(item, rootObj) {
  return String((item && item.ID_ketqua) || (rootObj && rootObj.ID_ketqua) || '').trim();
}

function getItemKhoaScoreForStorage_(item) {
  if (!item) return '';
  if (item.diemtc_bv !== undefined && item.diemtc_bv !== null && String(item.diemtc_bv).trim() !== '') {
    return String(item.diemtc_bv);
  }
  if (item.diemtc !== undefined && item.diemtc !== null && String(item.diemtc).trim() !== '') {
    return String(item.diemtc);
  }
  return '';
}

function getItemDoanScoreForStorage_(item) {
  if (!item) return '';
  if (item.diemtc_doan !== undefined && item.diemtc_doan !== null && String(item.diemtc_doan).trim() !== '') {
    return String(item.diemtc_doan);
  }
  if (item.diem_doan !== undefined && item.diem_doan !== null && String(item.diem_doan).trim() !== '') {
    return String(item.diem_doan);
  }
  return '';
}

function hydrateCriteriaItems_(criteriaObj) {
  if (!criteriaObj) return criteriaObj;
  const rootObj = criteriaObj;
  const items = getCriteriaItems_(rootObj);
  if (!Array.isArray(items) || items.length === 0) return rootObj;

  rootObj.ChiTiet = items.map(item => {
    const copy = Object.assign({}, item || {});
    const khoaScore = getItemKhoaScoreForStorage_(copy);
    const doanScore = getItemDoanScoreForStorage_(copy);

    if (khoaScore !== '') {
      copy.diemtc_bv = khoaScore;
      copy.diemtc = khoaScore;
    }
    if (doanScore !== '') {
      copy.diemtc_doan = doanScore;
      copy.diem_doan = doanScore;
      copy.diem = doanScore;
    } else {
      delete copy.diemtc_doan;
      delete copy.diem_doan;
      delete copy.diem;
    }

    if (copy.phong === undefined || copy.phong === '') copy.phong = rootObj.phong || '';
    if (copy.nguoicham === undefined || copy.nguoicham === '') copy.nguoicham = rootObj.nguoicham || '';
    if (copy.nhomkt === undefined || copy.nhomkt === '') copy.nhomkt = rootObj.nhomkt || '';
    if (copy.magop === undefined || copy.magop === '') copy.magop = rootObj.magop || '';
    if (copy.ID_ketqua === undefined || copy.ID_ketqua === '') copy.ID_ketqua = rootObj.ID_ketqua || '';
    return copy;
  });

  return rootObj;
}

function dehydrateCriteriaForStorage_(criteriaObj) {
  const obj = JSON.parse(JSON.stringify(criteriaObj || {}));
  const items = getCriteriaItems_(obj);
  obj.ChiTiet = (Array.isArray(items) ? items : []).map(item => {
    const copy = Object.assign({}, item || {});
    const khoaScore = getItemKhoaScoreForStorage_(copy);
    const doanScore = getItemDoanScoreForStorage_(copy);

    if (khoaScore !== '') copy.diemtc_bv = khoaScore;
    else delete copy.diemtc_bv;

    if (doanScore !== '') copy.diemtc_doan = doanScore;
    else delete copy.diemtc_doan;

    delete copy.phong;
    delete copy.nguoicham;
    delete copy.nhomkt;
    delete copy.magop;
    delete copy.ID_ketqua;
    delete copy.diemtc;
    delete copy.diem;
    delete copy.diem_doan;
    delete copy.Minhchung;
    delete copy.Minhchung_doan;
    delete copy.minhchung_bv;
    delete copy.minhchung_doan;
    delete copy.evidences_bv;
    delete copy.evidences_doan;
    return copy;
  });

  delete obj.danh_sach_muc_do;
  delete obj.danhSachMucDo;
  delete obj.diem;
  return obj;
}

function normalizeCriteriaObject_(criteriaObj) {
  const items = getCriteriaItems_(criteriaObj);
  if (items.length === 0) return criteriaObj;

  items.forEach(item => {
    const khoaScore = getItemKhoaScoreForStorage_(item);
    const doanScore = getItemDoanScoreForStorage_(item);
    if (khoaScore !== '') {
      item.diemtc_bv = khoaScore;
      item.diemtc = khoaScore;
    }
    if (doanScore !== '') {
      item.diemtc_doan = doanScore;
      item.diem_doan = doanScore;
      item.diem = doanScore;
    }
  });

  criteriaObj.ChiTiet = items;
  return hydrateCriteriaItems_(criteriaObj);
}

function applyCriteriaSettings_(criteriaObj, criteriaSettingsDict, rowMaGop) {
  if (!criteriaObj || !criteriaSettingsDict) return criteriaObj;

  const maTC = getCriteriaCodeFromMaGop_(rowMaGop || criteriaObj.magop);
  const meta = getCriteriaMeta_(criteriaSettingsDict, maTC);
  if (!meta) return criteriaObj;

  if (meta.phuTrach) criteriaObj.phong = meta.phuTrach;
  if (meta.nhom) criteriaObj.nhom_tieu_chi = meta.nhom;
  if (meta.phanNhom) criteriaObj.phan_nhom_tieu_chi = meta.phanNhom;
  if (meta.noiDung) criteriaObj.noi_dung_tieu_chi = meta.noiDung;

  const nhomKiemTra = criteriaObj.nhomkt || criteriaObj.nhom_kiem_tra || criteriaObj.nhomKiemTra || '';
  const inspector = nhomKiemTra && meta.inspectors
    ? (meta.inspectors[nhomKiemTra] || meta.inspectors[foldText_(nhomKiemTra)])
    : '';
  if (inspector) criteriaObj.nguoicham = inspector;

  const items = getCriteriaItems_(criteriaObj);
  items.forEach(item => {
    if (meta.phuTrach) item.phong = meta.phuTrach;
    if (inspector) item.nguoicham = inspector;
    if ((item.nhomkt === undefined || item.nhomkt === '') && nhomKiemTra) item.nhomkt = nhomKiemTra;
    if ((item.magop === undefined || item.magop === '') && criteriaObj.magop) item.magop = criteriaObj.magop;
    if ((item.ID_ketqua === undefined || item.ID_ketqua === '') && criteriaObj.ID_ketqua) item.ID_ketqua = criteriaObj.ID_ketqua;
  });

  criteriaObj.ChiTiet = items;
  return criteriaObj;
}

function getEffectiveIdKetQua_(rowId, criteriaObj) {
  return String(rowId || (criteriaObj && criteriaObj.ID_ketqua) || '').trim();
}

function getEffectiveMaGop_(rowMaGop, criteriaObj) {
  return String(rowMaGop || (criteriaObj && criteriaObj.magop) || '').trim();
}

function isSameMaGop_(rowMaGop, selectedMaGop) {
  if (!selectedMaGop) return true;
  return sameText_(rowMaGop, selectedMaGop);
}

function buildDataRowCacheName_(idKetQua, maGop) {
  return 'dataRow:' + sha256Hex_(String(idKetQua || '').trim() + '|' + String(maGop || '').trim());
}

function buildDataJsonIndexLookupKey_(idKetQua, maGop) {
  return sha256Hex_(String(idKetQua || '').trim() + '|' + foldText_(maGop || '')).slice(0, 40);
}

function buildDataJsonRowIndex_(sheet) {
  const lastRow = sheet.getLastRow();
  const index = {
    builtAtMs: Date.now(),
    lastRow: lastRow,
    rowCount: Math.max(0, lastRow - 1),
    byForm: {}
  };
  if (lastRow < 2) return index;

  const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  rows.forEach((row, i) => {
    const rowNumber = i + 2;
    const rowId = String(row[0] || '').trim();
    let rowMaGop = String(row[1] || '').trim();
    let jsonId = '';
    const jsonStr = row[2];

    if (jsonStr) {
      try {
        const jsonObj = JSON.parse(jsonStr);
        jsonId = getEffectiveIdKetQua_(rowId, jsonObj);
        rowMaGop = getEffectiveMaGop_(rowMaGop, jsonObj);
      } catch (e) {
        jsonId = rowId;
      }
    }

    [rowId, jsonId].forEach(idValue => {
      const idText = String(idValue || '').trim();
      if (!idText) return;
      index.byForm[buildDataJsonIndexLookupKey_(idText, rowMaGop)] = rowNumber;
    });
  });
  return index;
}

function getDataJsonRowIndex_(sheet, forceRebuild) {
  if (forceRebuild) invalidateAppCache_(CACHE_SCOPE_ROW_INDEX);
  return getCachedJson_(CACHE_SCOPE_ROW_INDEX, 'dataJsonRowIndex', CACHE_TTL_ROW_INDEX_SECONDS, () => buildDataJsonRowIndex_(sheet));
}

function lookupDataJsonRowFromIndex_(sheet, idKetQua, maGop, forceRebuild) {
  const index = getDataJsonRowIndex_(sheet, forceRebuild);
  const rowNumber = index && index.byForm
    ? Number(index.byForm[buildDataJsonIndexLookupKey_(idKetQua, maGop)] || 0)
    : 0;
  if (!rowNumber) return null;
  return readMatchingDataJsonRow_(sheet, rowNumber, idKetQua, maGop);
}

function readMatchingDataJsonRow_(sheet, rowNumber, idKetQua, maGop) {
  const lastRow = sheet.getLastRow();
  if (!rowNumber || rowNumber < 2 || rowNumber > lastRow) return null;

  const row = sheet.getRange(rowNumber, 1, 1, 8).getValues()[0];
  const rowId = String(row[0] || '').trim();
  const jsonStr = row[2];
  let jsonId = '';
  let rowMaGop = String(row[1] || '').trim();

  if (jsonStr) {
    try {
      const rowJsonObj = JSON.parse(jsonStr);
      jsonId = getEffectiveIdKetQua_(rowId, rowJsonObj);
      rowMaGop = getEffectiveMaGop_(row[1], rowJsonObj);
    } catch (e) {
      jsonId = rowId;
    }
  }

  const idMatches = rowId === String(idKetQua).trim() || jsonId === String(idKetQua).trim();
  const maGopMatches = isSameMaGop_(rowMaGop, String(maGop || '').trim());
  if (!idMatches || !maGopMatches) return null;

  return {
    rowNumber: rowNumber,
    row: row,
    jsonStr: jsonStr,
    evidenceStr: row[7],
    maGop: rowMaGop
  };
}

function findDataJsonRowForSave_(sheet, idKetQua, maGop) {
  const cache = CacheService.getScriptCache();
  const cacheName = buildDataRowCacheName_(idKetQua, maGop);
  const cacheKey = buildCacheKey_(CACHE_SCOPE_ROW_INDEX, cacheName);
  const cachedRowNumber = Number(cache.get(cacheKey) || 0);

  if (cachedRowNumber) {
    const cachedMatch = readMatchingDataJsonRow_(sheet, cachedRowNumber, idKetQua, maGop);
    if (cachedMatch && cachedMatch.jsonStr) return cachedMatch;
    cache.remove(cacheKey);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const indexedMatch = lookupDataJsonRowFromIndex_(sheet, idKetQua, maGop, false);
  if (indexedMatch && indexedMatch.jsonStr) {
    cache.put(cacheKey, String(indexedMatch.rowNumber), CACHE_TTL_ROW_INDEX_SECONDS);
    return indexedMatch;
  }

  const rebuiltIndexedMatch = lookupDataJsonRowFromIndex_(sheet, idKetQua, maGop, true);
  if (rebuiltIndexedMatch && rebuiltIndexedMatch.jsonStr) {
    cache.put(buildCacheKey_(CACHE_SCOPE_ROW_INDEX, cacheName), String(rebuiltIndexedMatch.rowNumber), CACHE_TTL_ROW_INDEX_SECONDS);
    return rebuiltIndexedMatch;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const targetMaGop = String(maGop || '').trim();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowId = String(row[0] || '').trim();
    const jsonStr = row[2];
    let jsonId = '';
    let rowMaGop = String(row[1] || '').trim();

    if (jsonStr) {
      try {
        const rowJsonObj = JSON.parse(jsonStr);
        jsonId = getEffectiveIdKetQua_(rowId, rowJsonObj);
        rowMaGop = getEffectiveMaGop_(row[1], rowJsonObj);
      } catch (e) {
        jsonId = rowId;
      }
    }

    const idMatches = rowId === String(idKetQua).trim() || jsonId === String(idKetQua).trim();
    const maGopMatches = isSameMaGop_(rowMaGop, targetMaGop);
    if (idMatches && maGopMatches) {
      const rowNumber = i + 2;
      cache.put(buildCacheKey_(CACHE_SCOPE_ROW_INDEX, cacheName), String(rowNumber), CACHE_TTL_ROW_INDEX_SECONDS);
      return {
        rowNumber: rowNumber,
        row: row,
        jsonStr: jsonStr,
        evidenceStr: row[7],
        maGop: rowMaGop
      };
    }
  }

  return null;
}

function getChecklistMasterData(khoa, phong, sessionToken) {
  const perfStart = Date.now();
  let perfUser = null;
  const perfTarget = String(khoa || '') + ' / ' + String(phong || 'All');
  let perfDetails = { khoa: khoa, phong: phong || 'All' };
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;
    perfUser = auth.user;

    const access = requireKhoaPhongAccess_(auth.user, khoa, phong);
    if (!access.success) return access;

    const cacheName = buildScopedUserDataCacheName_(auth.user, 'checklistMaster', {
      khoa: khoa,
      phong: phong || 'All'
    }, [buildDataKhoaScope_(khoa)]);
    return getCachedJson_(CACHE_SCOPE_DATA, cacheName, CACHE_TTL_DATA_SECONDS, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const idDanhGiaKhoa = getDepartmentCode_(khoa, ss);
    if (!idDanhGiaKhoa) return { success: false, message: `Không tìm thấy mã khoa cho: ${khoa}` };

    const criteriaDict = getCriteriaMetadataDict_(ss);

    const dataSheet = getDbSheet_();
    const lastRow = dataSheet.getLastRow();
    if (lastRow < 2) return { success: true, data: [] };

    // Đọc rộng sang cột H (Cột 8) để lấy song song dữ liệu minh chứng
    const dataRows = dataSheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const masterList = [];

    for (let i = 0; i < dataRows.length; i++) {
      const jsonStr = dataRows[i][2];  // Cột C
      const mcStr = dataRows[i][7];    // Cột H (Mới)
      
      if (jsonStr) {
        try {
          // Gộp in-memory điểm và minh chứng
          const jsonObj = mergeChecklistWithEvidence_(jsonStr, mcStr, criteriaDict, dataRows[i][1]);
          const idKetQua = getEffectiveIdKetQua_(dataRows[i][0], jsonObj);
          const maGop = getEffectiveMaGop_(dataRows[i][1], jsonObj);
          
          if (dataJsonRowMatchesDepartment_(dataRows[i], jsonObj, idDanhGiaKhoa, khoa) && jsonObj && Array.isArray(jsonObj.ChiTiet) && jsonObj.ChiTiet.length > 0) {
            
            let hasTaskForPhong = true;
            if (phong && phong !== 'All') {
              hasTaskForPhong = jsonObj.ChiTiet.some(item => isSamePhong_(item.phong, phong));
            }
            
            if (hasTaskForPhong) {
              const maTCRutGon = getCriteriaCodeFromMaGop_(maGop);
              const metaInfo = getCriteriaMeta_(criteriaDict, maTCRutGon) || { noiDung: "Nội dung tiêu chí chưa được cấu hình" };
              
              const subItemsFiltered = (phong && phong !== 'All') 
                ? jsonObj.ChiTiet.filter(item => isSamePhong_(item.phong, phong))
                : jsonObj.ChiTiet;
              const scoreBV = tinhDiemTieuChi_(subItemsFiltered, 'bv');
              const scoreDoan = tinhDiemTieuChi_(subItemsFiltered, 'doan');

              masterList.push({
                id_ketqua: idKetQua,
                magop: maGop,
                maTC: maTCRutGon,
                noiDung: metaInfo.noiDung,
                diemBV: scoreBV,
                diemDoan: scoreDoan,
                ChiTiet: subItemsFiltered 
              });
            }
          }
        } catch(err) {}
      }
    }

    masterList.sort((a, b) => a.maTC.localeCompare(b.maTC));
    perfDetails.items = masterList.length;
    return { success: true, data: masterList };
    });

  } catch (e) {
    perfDetails.error = e.message;
    return { success: false, message: "Lỗi hệ thống Master: " + e.message };
  } finally {
    logApiPerformance_(perfUser, 'getChecklistMasterData', perfTarget, perfStart, perfDetails, PERF_LOG_DEFAULT_THRESHOLD_MS);
  }
}

function getChiTietPhieuDaLoc(id_ketqua, phong, magop, sessionToken) {
  const perfStart = Date.now();
  let perfUser = null;
  let perfDetails = {
    id_ketqua: id_ketqua,
    magop: magop,
    phong: phong || 'All'
  };
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;
    perfUser = auth.user;

    const cacheName = buildScopedUserDataCacheName_(auth.user, 'checklistDetail', {
      id_ketqua: id_ketqua,
      magop: magop,
      phong: phong || 'All'
    }, [buildDataFormScope_(id_ketqua, magop)]);
    return getCachedJson_(CACHE_SCOPE_DATA, cacheName, CACHE_TTL_DATA_SECONDS, () => {
    const sheet = getDbSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, message: "Bảng dữ liệu Data_JSON rỗng." };

    const dataRow = findDataJsonRowForSave_(sheet, id_ketqua, magop);
    if (!dataRow || !dataRow.jsonStr) {
      return { success: false, message: "Không tìm thấy biểu mẫu có mã: " + id_ketqua + (magop ? " / " + magop : "") };
    }
    perfDetails.rowNumber = dataRow.rowNumber;

    const criteriaDict = getCriteriaMetadataDict_(SpreadsheetApp.openById(SPREADSHEET_ID));
    let fullJsonObj = null;
    try {
      // Gộp dữ liệu trong bộ nhớ để render lên Modal
      fullJsonObj = mergeChecklistWithEvidence_(dataRow.jsonStr, dataRow.evidenceStr, criteriaDict, dataRow.maGop);
    } catch (e) {
      return { success: false, message: "Phiếu này chưa được tạo dữ liệu JSON hợp lệ." };
    }

    const rowMaGop = getEffectiveMaGop_(dataRow.maGop, fullJsonObj);
    const dept = resolveDepartmentFromMaGop_(rowMaGop, getDepartmentsForList_());
    const khoaName = dept ? dept.name : String(dataRow.row[6] || '').trim();
    const access = requireKhoaPhongAccess_(auth.user, khoaName, phong || 'All');
    if (!access.success) return access;

    let filteredChiTiet = [];

    if (phong && phong !== 'All') {
      filteredChiTiet = (fullJsonObj.ChiTiet || []).filter(item => isSamePhong_(item.phong, phong));
    } else {
      filteredChiTiet = fullJsonObj.ChiTiet || [];
    }
    perfDetails.items = filteredChiTiet.length;
    
    if (filteredChiTiet.length === 0) {
       return { success: false, message: "Lỗi: Không tìm thấy tiêu chí nào khả dụng trong biểu mẫu này." };
    }

    return { 
      success: true, 
      data: { 
        ID_ketqua: id_ketqua, 
        magop: rowMaGop, 
        ChiTiet: filteredChiTiet 
      } 
    };
    });
  } catch (error) {
    perfDetails.error = error.message;
    return { success: false, message: "Lỗi đọc dữ liệu chi tiết: " + error.message };
  } finally {
    logApiPerformance_(perfUser, 'getChiTietPhieuDaLoc', String(id_ketqua || '') + ' / ' + String(magop || ''), perfStart, perfDetails, PERF_LOG_DEFAULT_THRESHOLD_MS);
  }
}

/**
 * LƯU KẾT QUẢ ĐÁNH GIÁ (GỘP KẾT QUẢ VÀ TÁCH SANG CỘT H ĐỂ BẢO VỆ DUNG LƯỢNG)
 */

function saveKetQuaSmartMerge(id_ketqua, updatedItemsFromFront, trangThai, magop, sessionToken) {
  const perfStart = Date.now();
  let perfDetails = {
    id_ketqua: id_ketqua,
    magop: magop,
    updatedItemsFromFront: Array.isArray(updatedItemsFromFront) ? updatedItemsFromFront.length : 0
  };
  const auth = requireSession_(sessionToken);
  if (!auth.success) return auth;
  const perfUser = auth.user;
  const targetMaGop = String(magop || '').trim();
  let criteriaDictForSave = null;
  let departmentsForSave = [];

  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    criteriaDictForSave = getCriteriaMetadataDict_(SpreadsheetApp.openById(SPREADSHEET_ID));
    departmentsForSave = getDepartmentsForList_();

    lock.waitLock(15000);
    lockAcquired = true;

    const sheet = getDbSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: "Bảng dữ liệu Data_JSON hiện tại đang trống." };
    }

    const dataRow = findDataJsonRowForSave_(sheet, id_ketqua, targetMaGop);
    const targetRowIndex = dataRow ? dataRow.rowNumber : -1;
    perfDetails.rowNumber = targetRowIndex;
    const targetRow = dataRow ? dataRow.row : [];
    const originalJsonStr = dataRow ? dataRow.jsonStr : null;
    const originalMcStr = dataRow ? dataRow.evidenceStr : null;
    
    if (targetRowIndex === -1 || !originalJsonStr) {
      return { success: false, message: "Không tìm thấy dòng dữ liệu gốc của tiêu chí" + (targetMaGop ? " (" + targetMaGop + ")" : "") + "." };
    }
    
    let originalJsonObj = JSON.parse(originalJsonStr);
    const effectiveMaGop = getEffectiveMaGop_(targetMaGop, originalJsonObj);
    originalJsonObj = applyCriteriaSettings_(
      normalizeCriteriaObject_(originalJsonObj),
      criteriaDictForSave,
      effectiveMaGop
    );
    const dept = resolveDepartmentFromMaGop_(effectiveMaGop, departmentsForSave);
    const khoaName = dept ? dept.name : String(targetRow[6] || '').trim();
    const khoaAccess = requireKhoaAccess_(auth.user, khoaName);
    if (!khoaAccess.success) return khoaAccess;
    const effectiveChecklistRole = getUserEffectiveChecklistRole_(auth.user);

    const originalItems = getCriteriaItems_(originalJsonObj);
    const allowedItemIds = {};
    originalItems.forEach(item => {
      if (hasPhongAccess_(auth.user, khoaName, item.phong || originalJsonObj.phong || '')) {
        allowedItemIds[String(item.id)] = true;
      }
    });

    const sanitizedUpdates = sanitizeUpdatedItemsForRole_(updatedItemsFromFront, effectiveChecklistRole)
      .filter(item => allowedItemIds[String(item.id)] && Object.keys(item).length > 1);
    perfDetails.sanitizedUpdates = sanitizedUpdates.length;

    if (sanitizedUpdates.length === 0 && (updatedItemsFromFront || []).length > 0) {
      return forbiddenResponse_('Không có tiểu mục nào trong phiếu này thuộc quyền cập nhật của bạn.');
    }
    
    // 1. Phân tách hoặc khởi tạo cấu trúc Minh chứng ở cột H
    let mcJsonObj = { ID_ketqua: id_ketqua, ChiTietMC: [] };
    if (originalMcStr) {
      try {
        mcJsonObj = JSON.parse(originalMcStr);
      } catch (e) {
        // Khôi phục nếu cột H bị lỗi cú pháp cũ
      }
    }
    if (!Array.isArray(mcJsonObj.ChiTietMC)) {
      mcJsonObj.ChiTietMC = [];
    }
    
    if (originalJsonObj && originalItems.length > 0) {
      const mergedItems = originalItems.map(originalItem => {
        const matchItem = sanitizedUpdates.find(frontItem => String(frontItem.id) === String(originalItem.id));
        
        // Truy xuất hoặc khởi tạo dòng minh chứng cục bộ ở mảng H
        let mcItem = mcJsonObj.ChiTietMC.find(mc => mc.id === originalItem.id);
        if (!mcItem) {
          mcItem = { id: originalItem.id, minhchung_bv: "", minhchung_doan: "" };
          mcJsonObj.ChiTietMC.push(mcItem);
        }

        if (matchItem) {
          // Lưu điểm số thuần túy vào cột C
          if (matchItem.diemtc_bv !== undefined) {
             setChecklistScoreValueForRole_(originalItem, 'Khoa', matchItem.diemtc_bv);
          }
          if (matchItem.diemtc_doan !== undefined) {
             setChecklistScoreValueForRole_(originalItem, 'DoanKT', matchItem.diemtc_doan);
          }

          // LƯU MINH CHỨNG NẶNG SANG CỘT H & dọn dẹp cột C để tối ưu hóa bộ nhớ
          if (matchItem.minhchung_bv !== undefined) {
             mcItem.minhchung_bv = matchItem.minhchung_bv;
             
             // Xóa bỏ trường minh chứng nặng nề ra khỏi cấu hình cột C
             delete originalItem.Minhchung;
             delete originalItem.minhchung_bv;
          }
          if (Array.isArray(matchItem.evidences_bv)) {
             mcItem.evidences_bv = sanitizeEvidenceListForSave_(matchItem.evidences_bv);
             delete originalItem.evidences_bv;
          }
          if (matchItem.minhchung_doan !== undefined) {
             mcItem.minhchung_doan = matchItem.minhchung_doan;
             delete originalItem.minhchung_doan;
          }
          if (Array.isArray(matchItem.evidences_doan)) {
             mcItem.evidences_doan = sanitizeEvidenceListForSave_(matchItem.evidences_doan);
             delete originalItem.evidences_doan;
          }
        }
        return originalItem;
      });

      originalJsonObj.ChiTiet = mergedItems;

      const scoreReadyObj = normalizeCriteriaObject_(JSON.parse(JSON.stringify(originalJsonObj)));
      originalJsonObj.diemtc = tinhDiemTieuChi_(scoreReadyObj.ChiTiet, 'bv');
      originalJsonObj.diemtc_doan = tinhDiemTieuChi_(scoreReadyObj.ChiTiet, 'doan');
      const serverTrangThai = buildSaveStatusForRole_(scoreReadyObj.ChiTiet, effectiveChecklistRole);
      const storageJsonObj = dehydrateCriteriaForStorage_(originalJsonObj);
      
      // 2. Ghi một lần vào các cột C:H để giảm thời gian giữ lock.
      sheet.getRange(targetRowIndex, 3, 1, 6).setValues([[
        JSON.stringify(storageJsonObj),
        serverTrangThai,
        new Date(),
        auth.user.name || auth.user.username,
        khoaName,
        JSON.stringify(mcJsonObj)
      ]]);
      if (lockAcquired) {
        lock.releaseLock();
        lockAcquired = false;
      }
      invalidateDataCacheForChange_(khoaName, effectiveMaGop, id_ketqua);
      logAudit_(auth.user, 'SAVE_SCORE', khoaName + ' / ' + effectiveMaGop, {
        id_ketqua: id_ketqua,
        magop: effectiveMaGop,
        role: effectiveChecklistRole,
        updatedItems: sanitizedUpdates.length,
        status: serverTrangThai
      });

      return { success: true, message: "Đã lưu kết quả đánh giá thành công!" };
    } else {
      return { success: false, message: "Cấu trúc dữ liệu gốc bị lỗi." };
    }
  } catch (e) {
    perfDetails.error = e.message;
    return { 
      success: false, 
      message: "Hệ thống đang quá tải do nhiều người cùng bấm lưu điểm một lúc. Vui lòng nhấn nút Lưu điểm lại sau 3 giây!" 
    };
  } finally {
    if (lockAcquired) lock.releaseLock();
    logApiPerformance_(perfUser, 'saveKetQuaSmartMerge', String(id_ketqua || '') + ' / ' + String(magop || ''), perfStart, perfDetails, PERF_LOG_SAVE_THRESHOLD_MS);
  }
}
