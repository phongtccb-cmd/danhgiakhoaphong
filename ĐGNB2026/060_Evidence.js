/**
 * 060_Evidence.js
 * Evidence reading, normalization, and updates.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function isSamePhong_(itemPhong, selectedPhong) {
  return sameText_(itemPhong, selectedPhong);
}

function normalizeEvidenceText_(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return "";
}

function extractEvidenceUrl_(value) {
  const text = normalizeEvidenceText_(value).trim();
  if (!text) return "";
  const absoluteMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (absoluteMatch) return absoluteMatch[0].replace(/[),.;]+$/g, "");
  const driveMatch = text.match(/(?:^|\s)(drive\.google\.com\/[^\s"'<>]+)/i);
  return driveMatch ? ('https://' + driveMatch[1].replace(/[),.;]+$/g, "")) : "";
}

function normalizeEvidenceStatus_(value) {
  const status = String(value || '').trim();
  return ['draft', 'need_update', 'reviewed', 'unused'].includes(status) ? status : '';
}

function getEffectiveEvidenceStatus_(mcItem, evidenceText) {
  const status = normalizeEvidenceStatus_(mcItem && mcItem.evidence_status);
  if (status) return status;
  return normalizeEvidenceText_(evidenceText).trim() ? 'draft' : 'missing';
}

function buildEvidenceMcMap_(evidenceJsonStr) {
  const mcMap = {};
  if (!evidenceJsonStr) return mcMap;
  try {
    const evidenceObj = JSON.parse(evidenceJsonStr);
    if (evidenceObj && Array.isArray(evidenceObj.ChiTietMC)) {
      evidenceObj.ChiTietMC.forEach(mc => {
        if (mc && mc.id !== undefined) mcMap[String(mc.id)] = mc;
      });
    }
  } catch (e) {}
  return mcMap;
}

function normalizeEvidenceList_(items) {
  return (Array.isArray(items) ? items : [])
    .map(item => ({
      id: String(item && item.id || ''),
      title: String(item && item.title || ''),
      url: String(item && item.url || ''),
      type: String(item && item.type || ''),
      note: String(item && item.note || ''),
      uploadedBy: String(item && item.uploadedBy || ''),
      uploadedAt: String(item && item.uploadedAt || '')
    }))
    .filter(item => item.title || item.url || item.note);
}

function toEvidenceIsoString_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * HÀM HELPER: Gộp dữ liệu điểm (Cột C) và minh chứng (Cột H) trong bộ nhớ trước khi gửi đi
 */

function mergeChecklistWithEvidence_(criteriaJsonStr, evidenceJsonStr, criteriaSettingsDict, rowMaGop) {
  if (!criteriaJsonStr) return null;
  
  const criteriaObj = applyCriteriaSettings_(
    normalizeCriteriaObject_(JSON.parse(criteriaJsonStr)),
    criteriaSettingsDict || {},
    rowMaGop
  );
  if (!criteriaObj || !Array.isArray(criteriaObj.ChiTiet)) return criteriaObj;

  // Điền cấu trúc minh chứng mặc định sạch sẽ cho các ô
  criteriaObj.ChiTiet.forEach(item => {
    const minhChungBv = normalizeEvidenceText_(
      item.minhchung_bv !== undefined ? item.minhchung_bv : item.Minhchung
    );
    const minhChungDoan = normalizeEvidenceText_(
      item.minhchung_doan !== undefined ? item.minhchung_doan : item.Minhchung_doan
    );
    item.minhchung_bv = minhChungBv;
    item.Minhchung = minhChungBv;
    item.minhchung_doan = minhChungDoan;
    item.evidences_bv = normalizeEvidenceList_(item.evidences_bv);
    item.evidences_doan = normalizeEvidenceList_(item.evidences_doan);
  });

  if (evidenceJsonStr) {
    try {
      const evidenceObj = JSON.parse(evidenceJsonStr);
      if (evidenceObj && Array.isArray(evidenceObj.ChiTietMC)) {
        const mcMap = {};
        evidenceObj.ChiTietMC.forEach(mc => {
          mcMap[mc.id] = mc;
        });

        criteriaObj.ChiTiet.forEach(item => {
          if (mcMap[item.id]) {
            item.minhchung_bv = normalizeEvidenceText_(mcMap[item.id].minhchung_bv);
            item.Minhchung = item.minhchung_bv; // Hỗ trợ tương thích ngược
            item.minhchung_doan = normalizeEvidenceText_(mcMap[item.id].minhchung_doan);
            item.evidences_bv = normalizeEvidenceList_(mcMap[item.id].evidences_bv);
            item.evidences_doan = normalizeEvidenceList_(mcMap[item.id].evidences_doan);
          }
        });
      }
    } catch (e) {
      // Fail-safe nếu chuỗi JSON cột H gặp vấn đề cấu trúc
    }
  }
  return criteriaObj;
}

function getEvidenceManagementData(khoa, phong, sessionToken) {
  const perfStart = Date.now();
  let perfUser = null;
  const perfTarget = String(khoa || '') + ' / ' + String(phong || 'All');
  let perfDetails = { khoa: khoa, phong: phong || 'All' };
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;
    perfUser = auth.user;

    const khoaName = String(khoa || '').trim();
    if (!khoaName) return { success: false, message: 'Vui lòng chọn khoa cần quản lý minh chứng.' };

    const selectedPhong = String(phong || 'All').trim() || 'All';
    const access = selectedPhong === 'All'
      ? requireKhoaAccess_(auth.user, khoaName)
      : requireKhoaPhongAccess_(auth.user, khoaName, selectedPhong);
    if (!access.success) return access;

    const cacheName = buildScopedUserDataCacheName_(auth.user, 'evidenceManagement', {
      khoa: khoaName,
      phong: selectedPhong
    }, [buildDataKhoaScope_(khoaName)]);
    return getCachedJson_(CACHE_SCOPE_DATA, cacheName, CACHE_TTL_DATA_SECONDS, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const idDanhGiaKhoa = getDepartmentCode_(khoaName, ss);
    if (!idDanhGiaKhoa) return { success: false, message: 'Không tìm thấy mã khoa cho: ' + khoaName };

    const criteriaDict = getCriteriaMetadataDict_(ss);
    const sheet = getDbSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, data: { items: [], stats: {} } };

    const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const items = [];

    rows.forEach(row => {
      const jsonStr = row[2];
      const evidenceStr = row[7];
      if (!jsonStr) return;

      try {
        const criteriaObj = mergeChecklistWithEvidence_(jsonStr, evidenceStr, criteriaDict, row[1]);
        if (!criteriaObj || !Array.isArray(criteriaObj.ChiTiet)) return;
        if (!dataJsonRowMatchesDepartment_(row, criteriaObj, idDanhGiaKhoa, khoaName)) return;

        const idKetQua = getEffectiveIdKetQua_(row[0], criteriaObj);
        const maGop = getEffectiveMaGop_(row[1], criteriaObj);
        const maTC = getCriteriaCodeFromMaGop_(maGop);
        const metaInfo = getCriteriaMeta_(criteriaDict, maTC) || {};
        const mcMap = buildEvidenceMcMap_(evidenceStr);

        criteriaObj.ChiTiet.forEach(detail => {
          const detailPhong = detail.phong || '';
          if (selectedPhong !== 'All' && !isSamePhong_(detailPhong, selectedPhong)) return;
          if (!hasPhongAccess_(auth.user, khoaName, detailPhong)) return;

          const mcItem = mcMap[String(detail.id)] || {};
          const minhChungBv = normalizeEvidenceText_(
            detail.minhchung_bv !== undefined ? detail.minhchung_bv : detail.Minhchung
          );
          const minhChungDoan = normalizeEvidenceText_(detail.minhchung_doan);
          const evidenceListBv = normalizeEvidenceList_(detail.evidences_bv || mcItem.evidences_bv);
          const evidenceListDoan = normalizeEvidenceList_(detail.evidences_doan || mcItem.evidences_doan);
          const evidenceCount = evidenceListBv.length + (minhChungBv.trim() ? 1 : 0);
          const evidenceUrl = extractEvidenceUrl_(minhChungBv) || (evidenceListBv[0] && evidenceListBv[0].url ? evidenceListBv[0].url : '');
          const status = getEffectiveEvidenceStatus_(mcItem, minhChungBv || (evidenceListBv.length ? 'multi' : ''));

          items.push({
            id_ketqua: idKetQua,
            magop: maGop,
            maTC: maTC,
            khoa: khoaName,
            phong: detailPhong,
            itemId: String(detail.id || ''),
            mucdo: detail.mucdo || '',
            noiDungTieuChi: metaInfo.noiDung || criteriaObj.noi_dung_tieu_chi || '',
            noiDungTieuMuc: detail.noidungtc || detail.noi_dung || '',
            cachCham: detail.noidungkt || detail.phuongphap || '',
            bangchungGoiY: detail.bangchung || '',
            diemBV: detail.diemtc_bv !== undefined ? detail.diemtc_bv : detail.diemtc,
            diemDoan: detail.diemtc_doan !== undefined ? detail.diemtc_doan : (detail.diem_doan !== undefined ? detail.diem_doan : ''),
            minhchung_bv: minhChungBv,
            minhchung_doan: minhChungDoan,
            evidences_bv: evidenceListBv,
            evidences_doan: evidenceListDoan,
            evidenceCount: evidenceCount,
            evidenceUrl: evidenceUrl,
            hasEvidence: evidenceCount > 0,
            hasDriveLink: /drive\.google\.com/i.test([evidenceUrl, minhChungBv].concat(evidenceListBv.map(ev => ev.url || '')).join(' ')),
            evidence_status: status,
            evidence_review_note: mcItem.evidence_review_note || '',
            evidence_reviewed_by: mcItem.evidence_reviewed_by || '',
            evidence_reviewed_at: mcItem.evidence_reviewed_at || '',
            updatedAt: toEvidenceIsoString_(row[4]),
            updatedBy: row[5] || ''
          });
        });
      } catch (e) {}
    });

    items.sort((a, b) => String(a.maTC || '').localeCompare(String(b.maTC || '')) || String(a.itemId || '').localeCompare(String(b.itemId || '')));
    const stats = items.reduce((acc, item) => {
      acc.total++;
      if (item.hasEvidence) acc.withEvidence++;
      else acc.missing++;
      if (item.hasDriveLink) acc.withDriveLink++;
      acc.byStatus[item.evidence_status] = (acc.byStatus[item.evidence_status] || 0) + 1;
      return acc;
    }, { total: 0, withEvidence: 0, missing: 0, withDriveLink: 0, byStatus: {} });

    perfDetails.items = items.length;
    return { success: true, data: { items: items, stats: stats } };
    });
  } catch (e) {
    perfDetails.error = e.message;
    return { success: false, message: 'Lỗi tải danh sách minh chứng: ' + e.message };
  } finally {
    logApiPerformance_(perfUser, 'getEvidenceManagementData', perfTarget, perfStart, perfDetails, PERF_LOG_DEFAULT_THRESHOLD_MS);
  }
}

function updateEvidenceItem(id_ketqua, magop, itemId, payload, sessionToken) {
  const auth = requireSession_(sessionToken);
  if (!auth.success) return auth;
  if (auth.user && (auth.user.role === 'DoanKT' || auth.user.role === 'DoanXN')) {
    return forbiddenResponse_('Tài khoản đoàn kiểm tra chỉ xem minh chứng, không cập nhật rà soát của khoa.');
  }

  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(15000);
    lockAcquired = true;

    const sheet = getDbSheet_();
    const dataRow = findDataJsonRowForSave_(sheet, id_ketqua, magop);
    if (!dataRow || !dataRow.jsonStr) {
      return { success: false, message: 'Không tìm thấy dòng dữ liệu minh chứng cần cập nhật.' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const criteriaDict = getCriteriaMetadataDict_(ss);
    let criteriaObj = applyCriteriaSettings_(
      normalizeCriteriaObject_(JSON.parse(dataRow.jsonStr)),
      criteriaDict,
      getEffectiveMaGop_(magop, null)
    );
    const effectiveMaGop = getEffectiveMaGop_(dataRow.maGop || magop, criteriaObj);
    criteriaObj = applyCriteriaSettings_(criteriaObj, criteriaDict, effectiveMaGop);
    const dept = resolveDepartmentFromMaGop_(effectiveMaGop, getDepartmentsForList_());
    const khoaName = dept ? dept.name : String(dataRow.row[6] || '').trim();
    const khoaAccess = requireKhoaAccess_(auth.user, khoaName);
    if (!khoaAccess.success) return khoaAccess;

    const items = getCriteriaItems_(criteriaObj);
    const targetItem = items.find(item => String(item.id) === String(itemId));
    if (!targetItem) return { success: false, message: 'Không tìm thấy tiểu mục minh chứng cần cập nhật.' };
    if (!hasPhongAccess_(auth.user, khoaName, targetItem.phong || '')) {
      return forbiddenResponse_('Bạn không có quyền cập nhật minh chứng của phòng phụ trách này.');
    }

    let mcJsonObj = { ID_ketqua: id_ketqua, ChiTietMC: [] };
    if (dataRow.evidenceStr) {
      try {
        mcJsonObj = JSON.parse(dataRow.evidenceStr);
      } catch (e) {}
    }
    if (!Array.isArray(mcJsonObj.ChiTietMC)) mcJsonObj.ChiTietMC = [];

    let mcItem = mcJsonObj.ChiTietMC.find(mc => String(mc.id) === String(itemId));
    if (!mcItem) {
      mcItem = { id: String(itemId), minhchung_bv: '', minhchung_doan: '' };
      mcJsonObj.ChiTietMC.push(mcItem);
    }

    const body = payload || {};
    if (body.minhchung_bv !== undefined) mcItem.minhchung_bv = normalizeEvidenceText_(body.minhchung_bv);
    if (Array.isArray(body.evidences_bv)) mcItem.evidences_bv = sanitizeEvidenceListForSave_(body.evidences_bv);
    if (Array.isArray(body.evidences_doan)) mcItem.evidences_doan = sanitizeEvidenceListForSave_(body.evidences_doan);
    const status = normalizeEvidenceStatus_(body.evidence_status);
    if (status) {
      mcItem.evidence_status = status;
      if (status === 'reviewed') {
        mcItem.evidence_reviewed_by = auth.user.name || auth.user.username || '';
        mcItem.evidence_reviewed_at = new Date().toISOString();
      } else {
        mcItem.evidence_reviewed_by = '';
        mcItem.evidence_reviewed_at = '';
      }
    }
    if (body.evidence_review_note !== undefined) {
      mcItem.evidence_review_note = normalizeEvidenceText_(body.evidence_review_note);
    }
    mcItem.evidence_updated_by = auth.user.name || auth.user.username || '';
    mcItem.evidence_updated_at = new Date().toISOString();

    sheet.getRange(dataRow.rowNumber, 5, 1, 2).setValues([[new Date(), auth.user.name || auth.user.username || '']]);
    sheet.getRange(dataRow.rowNumber, 8).setValue(JSON.stringify(mcJsonObj));
    invalidateDataCacheForChange_(khoaName, effectiveMaGop, id_ketqua);
    logAudit_(auth.user, 'UPDATE_EVIDENCE', khoaName + ' / ' + effectiveMaGop + ' / ' + itemId, {
      id_ketqua: id_ketqua,
      magop: effectiveMaGop,
      status: mcItem.evidence_status || '',
      hasEvidence: normalizeEvidenceText_(mcItem.minhchung_bv).trim() !== ''
    });

    return { success: true, message: 'Đã cập nhật minh chứng.', data: mcItem };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật minh chứng: ' + e.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}
