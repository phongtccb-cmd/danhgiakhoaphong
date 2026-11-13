/**
 * 070_Dashboard.js
 * Scores, summaries, reports, and dashboard data.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function tinhDiemTieuChi_(chiTiet, role) {
  if (!chiTiet || chiTiet.length === 0) return 0;

  let hasScored = false;
  for (let i = 0; i < chiTiet.length; i++) {
    let val = (role === 'bv') 
        ? (chiTiet[i].diemtc_bv !== undefined && chiTiet[i].diemtc_bv !== "" ? chiTiet[i].diemtc_bv : (chiTiet[i].diemtc || "")) 
        : (chiTiet[i].diemtc_doan !== undefined && chiTiet[i].diemtc_doan !== "" ? chiTiet[i].diemtc_doan : (chiTiet[i].diem_doan !== undefined && chiTiet[i].diem_doan !== "" ? chiTiet[i].diem_doan : ""));
    if (val !== "") {
        hasScored = true;
        break;
    }
  }

  if (!hasScored) return 0; 

  const muc2 = chiTiet.filter(i => String(i.mucdo) === "2");
  const muc3 = chiTiet.filter(i => String(i.mucdo) === "3");
  const muc4 = chiTiet.filter(i => String(i.mucdo) === "4");
  const muc5 = chiTiet.filter(i => String(i.mucdo) === "5");

  const checkPassLevel = (items) => {
    if (items.length === 0) return false; 
    return items.every(item => {
      let val = (role === 'bv') 
          ? (item.diemtc_bv !== undefined && item.diemtc_bv !== "" ? item.diemtc_bv : (item.diemtc || "")) 
          : (item.diemtc_doan !== undefined && item.diemtc_doan !== "" ? item.diemtc_doan : (item.diem_doan !== undefined && item.diem_doan !== "" ? item.diem_doan : ""));
      return String(val) === "1"; 
    });
  };

  if (!checkPassLevel(muc2)) return 1; 
  if (!checkPassLevel(muc3)) return 2; 
  if (!checkPassLevel(muc4)) return 3; 
  if (!checkPassLevel(muc5)) return 4; 
  
  return 5;
}

function getKetQuaTongHop(khoa, sessionToken) {
  const perfStart = Date.now();
  let perfUser = null;
  let perfDetails = { khoa: khoa };
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;
    perfUser = auth.user;

    const access = requireKhoaAccess_(auth.user, khoa);
    if (!access.success) return access;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const idDanhGiaKhoa = getDepartmentCode_(khoa, ss);
    
    if (!idDanhGiaKhoa) return { success: false, message: `Không tìm thấy mã khoa cho: ${khoa}` };

    const criteriaDict = getCriteriaMetadataDict_(ss);

    const dataSheet = ss.getSheetByName("Data_JSON");
    if (!dataSheet) return { success: false, message: "Chưa có sheet Data_JSON" };
    if (dataSheet.getLastRow() < 2) return { success: true, data: {
      khoa: khoa,
      totalMax: 0,
      totalBV: 0,
      totalDoan: 0,
      appSettings: getAppSettings_(),
      details: []
    } };
    
    const dataRows = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 8).getValues();
    
    let summary = {
      khoa: khoa,
      totalMax: 0,
      totalBV: 0,
      totalDoan: 0,
      appSettings: getAppSettings_(),
      details: []
    };

    for (let i = 0; i < dataRows.length; i++) {
      const jsonStr = dataRows[i][2];  
      const mcStr = dataRows[i][7]; // Đọc kèm minh chứng ở Cột H (Mới)
      const trangThai = dataRows[i][3];
      
      if (jsonStr) {
        try {
          // Gộp dữ liệu điểm số cột C và minh chứng cột H trong bộ nhớ
          const jsonObj = mergeChecklistWithEvidence_(jsonStr, mcStr, criteriaDict, dataRows[i][1]);
          const maGop = getEffectiveMaGop_(dataRows[i][1], jsonObj);
          if (dataJsonRowMatchesDepartment_(dataRows[i], jsonObj, idDanhGiaKhoa, khoa) && jsonObj && Array.isArray(jsonObj.ChiTiet)) {
            
            let diemBV = tinhDiemTieuChi_(jsonObj.ChiTiet, 'bv');
            let diemDoan = tinhDiemTieuChi_(jsonObj.ChiTiet, 'doan');

            summary.totalMax += 5; 
            summary.totalBV += diemBV;
            summary.totalDoan += diemDoan;

            const maTCRutGon = getCriteriaCodeFromMaGop_(maGop);
            
            const metaInfo = getCriteriaMeta_(criteriaDict, maTCRutGon) || {
              nhom: "NHÓM KHÁC",
              phanNhom: "Chưa phân nhóm",
              noiDung: "Không có thông tin nội dung"
            };

            summary.details.push({
              magop: maGop,
              maTC: maTCRutGon,
              nhom: metaInfo.nhom,
              phanNhom: metaInfo.phanNhom,
              noiDung: metaInfo.noiDung,
              trangThai: trangThai || "Chưa chấm",
              max: 5,
              bv: diemBV,
              doan: diemDoan,
              ChiTiet: jsonObj.ChiTiet // KHAI BÁO THÊM TRƯỜNG CHITIET CHỨA BIẾN PHONG VÀ NGUOICHAM VỀ CLIENT EXCEL
            });
          }
        } catch(e) {}
      }
    }

    summary.details.sort((a, b) => a.maTC.localeCompare(b.maTC));
    perfDetails.details = summary.details.length;
    return { success: true, data: summary };

  } catch (e) {
    perfDetails.error = e.message;
    return { success: false, message: "Lỗi tổng hợp dữ liệu: " + e.message };
  } finally {
    logApiPerformance_(perfUser, 'getKetQuaTongHop', String(khoa || ''), perfStart, perfDetails, PERF_LOG_DEFAULT_THRESHOLD_MS);
  }
}

function getScoreValueForRole_(item, role) {
  if (!item) return '';
  if (role === 'doan') {
    if (item.diemtc_doan !== undefined && item.diemtc_doan !== '') return String(item.diemtc_doan);
    if (item.diem_doan !== undefined && item.diem_doan !== '') return String(item.diem_doan);
    return '';
  }

  if (item.diemtc_bv !== undefined && item.diemtc_bv !== '') return String(item.diemtc_bv);
  if (item.diemtc !== undefined && item.diemtc !== '') return String(item.diemtc);
  return '';
}

function countScoredItems_(items, role) {
  return (items || []).filter(item => getScoreValueForRole_(item, role) !== '').length;
}

function countEvidenceItems_(items) {
  return (items || []).filter(item => {
    const bv = normalizeEvidenceText_(item.minhchung_bv !== undefined ? item.minhchung_bv : item.Minhchung);
    const doan = normalizeEvidenceText_(item.minhchung_doan);
    return bv.trim() !== '' || doan.trim() !== '';
  }).length;
}

function getDepartmentsForList_() {
  return getCachedJson_(CACHE_SCOPE_DEPARTMENT, 'departmentsForList', CACHE_TTL_CONFIG_SECONDS, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configured = getConfiguredDepartments_();
    const deptSheet = ss.getSheetByName('Department');
    let legacy = [];

    if (deptSheet && deptSheet.getLastRow() >= 2) {
      const data = deptSheet.getRange(2, 1, deptSheet.getLastRow() - 1, Math.max(2, deptSheet.getLastColumn())).getValues();
      legacy = data
        .map(row => ({ name: String(row[0] || '').trim(), code: String(row[1] || row[0] || '').trim() }))
        .filter(item => item.name && item.code);
    }

    return mergeDepartmentUnits_([configured, legacy, getDataJsonDepartmentUnits_(ss)]);
  });
}

function resolveDepartmentFromMaGop_(maGop, departments) {
  const text = String(maGop || '').trim();
  if (!text) return null;

  const sortedDepartments = (departments || [])
    .slice()
    .sort((a, b) => String(b.code || '').length - String(a.code || '').length);

  for (let i = 0; i < sortedDepartments.length; i++) {
    const dept = sortedDepartments[i];
    const code = String(dept.code || '').trim();
    if (code && text.indexOf(code) === 0) return dept;
  }

  return null;
}

function getBangTongHopDanhGia(khoaList, sessionToken) {
  const perfStart = Date.now();
  let perfUser = null;
  let perfDetails = {
    requestedKhoas: Array.isArray(khoaList) ? khoaList.length : 0
  };
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;
    perfUser = auth.user;

    const requestedKhoasRaw = Array.isArray(khoaList) ? khoaList.map(item => String(item || '').trim()).filter(Boolean) : [];
    const requestedAll = requestedKhoasRaw.some(isAllAccessValue_);
    const requestedKhoas = requestedAll ? [] : requestedKhoasRaw.filter(item => !isAllAccessValue_(item));
    const canAccessAll = userCanAccessAllKhoa_(auth.user);
    const sessionKhoas = getUserAllowedKhoas_(auth.user);
    const allowedKhoas = canAccessAll
      ? requestedKhoas
      : (requestedKhoas.length > 0 ? requestedKhoas.filter(khoa => hasKhoaAccess_(auth.user, khoa)) : sessionKhoas);
    perfDetails.allowedKhoas = allowedKhoas.length;
    perfDetails.canAccessAll = canAccessAll;

    if (!canAccessAll && allowedKhoas.length === 0) {
      return {
        success: true,
        data: {
          rows: [],
          departments: [],
          stats: {
            totalCriteria: 0,
            totalDepartments: 0,
            bvCompleted: 0,
            doanCompleted: 0,
            diffCount: 0,
            totalMax: 0,
            totalBV: 0,
            totalDoan: 0,
            lastUpdated: ''
          }
        }
      };
    }

    const cacheName = buildScopedUserDataCacheName_(auth.user, 'listSummary', {
      requestedAll: requestedAll,
      requestedKhoas: requestedKhoas,
      allowedKhoas: allowedKhoas
    }, [CACHE_SCOPE_DASHBOARD]);
    return getCachedJson_(CACHE_SCOPE_DASHBOARD, cacheName, CACHE_TTL_DASHBOARD_SECONDS, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dataSheet = ss.getSheetByName(SHEET_NAME);
    if (!dataSheet || dataSheet.getLastRow() < 2) {
      return {
        success: true,
        data: {
          rows: [],
          departments: [],
          stats: {
            totalCriteria: 0,
            totalDepartments: 0,
            bvCompleted: 0,
            doanCompleted: 0,
            diffCount: 0,
            totalMax: 0,
            totalBV: 0,
            totalDoan: 0,
            lastUpdated: ''
          }
        }
      };
    }

    const departments = getDepartmentsForList_();
    const criteriaDict = getCriteriaMetadataDict_(ss);
    const dataRows = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 8).getValues();
    const rows = [];
    const departmentStats = {};
    let latestUpdated = null;

    dataRows.forEach((sheetRow, index) => {
      const jsonStr = sheetRow[2];
      if (!jsonStr) return;

      try {
        const jsonObj = mergeChecklistWithEvidence_(jsonStr, sheetRow[7], criteriaDict, sheetRow[1]);
        const maGop = getEffectiveMaGop_(sheetRow[1], jsonObj);
        const dept = resolveDepartmentFromMaGop_(maGop, departments);
        const khoaName = dept ? dept.name : String(sheetRow[6] || '').trim();

        if (!khoaName) return;
        if (allowedKhoas.length > 0) {
          const khoaCode = getDepartmentCode_(khoaName, ss);
          const canReadKhoa = allowedKhoas.some(allowed => accessValueMatchesDepartment_(allowed, khoaName, khoaCode));
          if (!canReadKhoa) return;
        }
        if (!jsonObj || !Array.isArray(jsonObj.ChiTiet) || jsonObj.ChiTiet.length === 0) return;

        const maTC = getCriteriaCodeFromMaGop_(maGop);
        const metaInfo = getCriteriaMeta_(criteriaDict, maTC) || {};
        const items = jsonObj.ChiTiet;
        const diemBV = tinhDiemTieuChi_(items, 'bv');
        const diemDoan = tinhDiemTieuChi_(items, 'doan');
        const bvScored = countScoredItems_(items, 'bv');
        const doanScored = countScoredItems_(items, 'doan');
        const totalItems = items.length;
        const bvCompleted = totalItems > 0 && bvScored === totalItems;
        const doanCompleted = totalItems > 0 && doanScored === totalItems;
        const updatedDate = sheetRow[4] instanceof Date ? sheetRow[4] : (sheetRow[4] ? new Date(sheetRow[4]) : null);

        if (updatedDate && !isNaN(updatedDate.getTime()) && (!latestUpdated || updatedDate > latestUpdated)) {
          latestUpdated = updatedDate;
        }

        const row = {
          rowNumber: index + 2,
          id_ketqua: getEffectiveIdKetQua_(sheetRow[0], jsonObj),
          magop: maGop,
          khoa: khoaName,
          maTC: maTC,
          nhom: metaInfo.nhom || 'NHÓM KHÁC',
          phanNhom: metaInfo.phanNhom || '',
          noiDung: metaInfo.noiDung || 'Chưa có nội dung tiêu chí',
          phong: metaInfo.phuTrach || getUniquePropertyForServer_(items, 'phong'),
          nguoiCham: String(sheetRow[5] || getUniquePropertyForServer_(items, 'nguoicham') || '').trim(),
          trangThai: String(sheetRow[3] || 'Chưa chấm').trim(),
          lastUpdated: formatDateTimeForClient_(sheetRow[4]),
          lastUpdatedMs: updatedDate && !isNaN(updatedDate.getTime()) ? updatedDate.getTime() : 0,
          totalItems: totalItems,
          bvScored: bvScored,
          doanScored: doanScored,
          bvCompleted: bvCompleted,
          doanCompleted: doanCompleted,
          evidenceCount: countEvidenceItems_(items),
          diemBV: diemBV,
          diemDoan: diemDoan,
          diff: diemDoan > 0 ? diemDoan - diemBV : 0
        };

        rows.push(row);

        if (!departmentStats[khoaName]) {
          departmentStats[khoaName] = {
            khoa: khoaName,
            totalCriteria: 0,
            bvCompleted: 0,
            doanCompleted: 0,
            totalMax: 0,
            totalBV: 0,
            totalDoan: 0
          };
        }

        departmentStats[khoaName].totalCriteria += 1;
        departmentStats[khoaName].bvCompleted += bvCompleted ? 1 : 0;
        departmentStats[khoaName].doanCompleted += doanCompleted ? 1 : 0;
        departmentStats[khoaName].totalMax += 5;
        departmentStats[khoaName].totalBV += diemBV;
        departmentStats[khoaName].totalDoan += diemDoan;
      } catch (err) {
        // Skip malformed criteria rows but keep the summary usable.
      }
    });

    rows.sort((a, b) => {
      const byKhoa = a.khoa.localeCompare(b.khoa);
      return byKhoa !== 0 ? byKhoa : a.maTC.localeCompare(b.maTC);
    });

    const stats = rows.reduce((acc, row) => {
      acc.totalCriteria += 1;
      acc.totalMax += 5;
      acc.totalBV += row.diemBV;
      acc.totalDoan += row.diemDoan;
      acc.bvCompleted += row.bvCompleted ? 1 : 0;
      acc.doanCompleted += row.doanCompleted ? 1 : 0;
      acc.diffCount += row.diff !== 0 ? 1 : 0;
      acc.departments[row.khoa] = true;
      return acc;
    }, {
      totalCriteria: 0,
      totalDepartments: 0,
      bvCompleted: 0,
      doanCompleted: 0,
      diffCount: 0,
      totalMax: 0,
      totalBV: 0,
      totalDoan: 0,
      lastUpdated: '',
      departments: {}
    });

    stats.totalDepartments = Object.keys(stats.departments).length;
    stats.lastUpdated = formatDateTimeForClient_(latestUpdated);
    delete stats.departments;

    perfDetails.rows = rows.length;
    perfDetails.departments = Object.keys(departmentStats).length;

    return {
      success: true,
      data: {
        rows: rows,
        departments: Object.keys(departmentStats).sort().map(key => departmentStats[key]),
        stats: stats
      }
    };
    });
  } catch (e) {
    perfDetails.error = e.message;
    return { success: false, message: 'Lỗi tải bảng tổng hợp: ' + e.message };
  } finally {
    logApiPerformance_(perfUser, 'getBangTongHopDanhGia', '330_ResultView', perfStart, perfDetails, PERF_LOG_DEFAULT_THRESHOLD_MS);
  }
}

function dashboardPercent_(value, total) {
  const n = Number(value || 0);
  const d = Number(total || 0);
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

function getDashboardScopeLabel_(user) {
  if (!user) return 'Chưa xác định';
  if (user.role === 'Admin') return 'Toàn hệ thống';
  if (user.role === 'Khoa') {
    const khoas = getUserAllowedKhoas_(user);
    return khoas.length ? khoas.join(', ') : 'Khoa được phân quyền';
  }
  if (userCanAccessAllKhoa_(user)) return 'Tất cả dữ liệu được phân quyền';
  const khoas = getUserAllowedKhoas_(user);
  if (khoas.length === 1) return khoas[0];
  if (khoas.length > 1) return khoas.length + ' khoa được phân quyền';
  return 'Dữ liệu được phân quyền';
}

function getDashboardOverview(khoaList, sessionToken) {
  const perfStart = Date.now();
  let perfUser = null;
  let perfDetails = {
    requestedKhoas: Array.isArray(khoaList) ? khoaList.length : 0
  };
  try {
    const auth = requireDashboardAccess_(sessionToken);
    if (!auth.success) return auth;
    perfUser = auth.user;

    const requestedKhoasRaw = Array.isArray(khoaList) ? khoaList.map(item => String(item || '').trim()).filter(Boolean) : [];
    const requestedAll = requestedKhoasRaw.some(isAllAccessValue_);
    const requestedKhoas = requestedAll ? [] : requestedKhoasRaw.filter(item => !isAllAccessValue_(item));
    const canAccessAll = userCanAccessAllKhoa_(auth.user);
    const sessionKhoas = getUserAllowedKhoas_(auth.user);
    const allowedKhoas = canAccessAll
      ? requestedKhoas
      : (requestedKhoas.length > 0 ? requestedKhoas.filter(khoa => hasKhoaAccess_(auth.user, khoa)) : sessionKhoas);

    perfDetails.allowedKhoas = allowedKhoas.length;
    perfDetails.canAccessAll = canAccessAll;

    const emptyDashboardData = () => ({
      scopeLabel: getDashboardScopeLabel_(auth.user),
      generatedAt: formatDateTimeForClient_(new Date()),
      generatedAtMs: Date.now(),
      stats: {
        totalCriteria: 0,
        totalDepartments: 0,
        bvCompleted: 0,
        doanCompleted: 0,
        bothCompleted: 0,
        diffCount: 0,
        evidenceCount: 0,
        totalMax: 0,
        totalBV: 0,
        totalDoan: 0,
        scoreGap: 0,
        lastUpdated: '',
        lastUpdatedMs: 0
      },
      progress: {
        bvPercent: 0,
        doanPercent: 0,
        donePercent: 0,
        scoreBVPercent: 0,
        scoreDoanPercent: 0
      },
      status: {
        notStarted: 0,
        bvInProgress: 0,
        bvDoneAwaitDoan: 0,
        doanInProgress: 0,
        fullyDone: 0,
        diff: 0
      },
      departments: [],
      phongs: [],
      attentionRows: [],
      recentRows: [],
      auditRows: []
    });

    if (!canAccessAll && allowedKhoas.length === 0) {
      return { success: true, data: emptyDashboardData() };
    }

    const cacheName = buildScopedUserDataCacheName_(auth.user, 'dashboardOverview', {
      requestedAll: requestedAll,
      requestedKhoas: requestedKhoas,
      allowedKhoas: allowedKhoas
    }, [CACHE_SCOPE_DASHBOARD]);

    return getCachedJson_(CACHE_SCOPE_DASHBOARD, cacheName, CACHE_TTL_DASHBOARD_SECONDS, () => {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const dataSheet = ss.getSheetByName(SHEET_NAME);
      if (!dataSheet || dataSheet.getLastRow() < 2) {
        return { success: true, data: emptyDashboardData() };
      }

      const departmentsForList = getDepartmentsForList_();
      const sortedDepartments = (departmentsForList || [])
        .slice()
        .sort((a, b) => String(b.code || '').length - String(a.code || '').length);
      const criteriaDict = getCriteriaMetadataDict_(ss);
      const dataRows = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 8).getValues();
      const departmentCodeCache = {};
      const departmentMap = {};
      const phongMap = {};
      const attentionRows = [];
      const recentRows = [];

      const stats = {
        totalCriteria: 0,
        totalDepartments: 0,
        bvCompleted: 0,
        doanCompleted: 0,
        bothCompleted: 0,
        diffCount: 0,
        evidenceCount: 0,
        totalMax: 0,
        totalBV: 0,
        totalDoan: 0,
        scoreGap: 0,
        lastUpdated: '',
        lastUpdatedMs: 0
      };
      const status = {
        notStarted: 0,
        bvInProgress: 0,
        bvDoneAwaitDoan: 0,
        doanInProgress: 0,
        fullyDone: 0,
        diff: 0
      };
      let latestUpdated = null;

      const getKhoaCodeCached = khoaName => {
        const key = foldText_(khoaName);
        if (!departmentCodeCache[key]) {
          departmentCodeCache[key] = getDepartmentCode_(khoaName, ss);
        }
        return departmentCodeCache[key];
      };

      const resolveDepartmentFast = maGop => {
        const text = String(maGop || '').trim();
        if (!text) return null;
        for (let i = 0; i < sortedDepartments.length; i++) {
          const dept = sortedDepartments[i];
          const code = String(dept.code || '').trim();
          if (code && text.indexOf(code) === 0) return dept;
        }
        return null;
      };

      dataRows.forEach(sheetRow => {
        const jsonStr = sheetRow[2];
        if (!jsonStr) return;

        try {
          const jsonObj = applyCriteriaSettings_(
            normalizeCriteriaObject_(JSON.parse(jsonStr)),
            criteriaDict,
            sheetRow[1]
          );
          const maGop = getEffectiveMaGop_(sheetRow[1], jsonObj);
          const dept = resolveDepartmentFast(maGop);
          const khoaName = dept ? dept.name : String(sheetRow[6] || '').trim();
          if (!khoaName) return;

          if (allowedKhoas.length > 0) {
            const khoaCode = dept && dept.code ? dept.code : getKhoaCodeCached(khoaName);
            const canReadKhoa = allowedKhoas.some(allowed => accessValueMatchesDepartment_(allowed, khoaName, khoaCode));
            if (!canReadKhoa) return;
          }
          if (!jsonObj || !Array.isArray(jsonObj.ChiTiet) || jsonObj.ChiTiet.length === 0) return;

          const maTC = getCriteriaCodeFromMaGop_(maGop);
          const metaInfo = getCriteriaMeta_(criteriaDict, maTC) || {};
          const items = jsonObj.ChiTiet;
          const diemBV = tinhDiemTieuChi_(items, 'bv');
          const diemDoan = tinhDiemTieuChi_(items, 'doan');
          const bvScored = countScoredItems_(items, 'bv');
          const doanScored = countScoredItems_(items, 'doan');
          const totalItems = items.length;
          const bvCompleted = totalItems > 0 && bvScored === totalItems;
          const doanCompleted = totalItems > 0 && doanScored === totalItems;
          const bothCompleted = bvCompleted && doanCompleted;
          const diff = diemDoan > 0 ? diemDoan - diemBV : 0;
          const phong = String(metaInfo.phuTrach || getUniquePropertyForServer_(items, 'phong') || '').trim() || 'Ch\u01b0a ph\u00e2n c\u00f4ng';
          const updatedDate = sheetRow[4] instanceof Date ? sheetRow[4] : (sheetRow[4] ? new Date(sheetRow[4]) : null);
          const lastUpdatedMs = updatedDate && !isNaN(updatedDate.getTime()) ? updatedDate.getTime() : 0;
          const lastUpdated = formatDateTimeForClient_(sheetRow[4]);

          if (updatedDate && !isNaN(updatedDate.getTime()) && (!latestUpdated || updatedDate > latestUpdated)) {
            latestUpdated = updatedDate;
          }

          stats.totalCriteria += 1;
          stats.totalMax += 5;
          stats.totalBV += diemBV;
          stats.totalDoan += diemDoan;
          stats.bvCompleted += bvCompleted ? 1 : 0;
          stats.doanCompleted += doanCompleted ? 1 : 0;
          stats.bothCompleted += bothCompleted ? 1 : 0;
          stats.diffCount += diff !== 0 ? 1 : 0;
          stats.scoreGap += diff;

          if (!bvCompleted && bvScored === 0 && doanScored === 0) {
            status.notStarted += 1;
          } else if (bvCompleted && !doanCompleted) {
            status.bvDoneAwaitDoan += 1;
          } else if (!doanCompleted && doanScored > 0) {
            status.doanInProgress += 1;
          } else if (!bvCompleted && bvScored > 0) {
            status.bvInProgress += 1;
          }

          if (!departmentMap[khoaName]) {
            departmentMap[khoaName] = {
              khoa: khoaName,
              totalCriteria: 0,
              bvCompleted: 0,
              doanCompleted: 0,
              bothCompleted: 0,
              diffCount: 0,
              evidenceCount: 0,
              totalMax: 0,
              totalBV: 0,
              totalDoan: 0,
              scoreGap: 0,
              latestMs: 0,
              lastUpdated: ''
            };
          }
          departmentMap[khoaName].totalCriteria += 1;
          departmentMap[khoaName].bvCompleted += bvCompleted ? 1 : 0;
          departmentMap[khoaName].doanCompleted += doanCompleted ? 1 : 0;
          departmentMap[khoaName].bothCompleted += bothCompleted ? 1 : 0;
          departmentMap[khoaName].diffCount += diff !== 0 ? 1 : 0;
          departmentMap[khoaName].totalMax += 5;
          departmentMap[khoaName].totalBV += diemBV;
          departmentMap[khoaName].totalDoan += diemDoan;
          departmentMap[khoaName].scoreGap += diff;
          if (lastUpdatedMs > departmentMap[khoaName].latestMs) {
            departmentMap[khoaName].latestMs = lastUpdatedMs;
            departmentMap[khoaName].lastUpdated = lastUpdated;
          }

          if (!phongMap[phong]) {
            phongMap[phong] = {
              phong: phong,
            totalCriteria: 0,
            bvCompleted: 0,
            doanCompleted: 0,
            diffCount: 0,
            remainingDoan: 0
            };
          }
          phongMap[phong].totalCriteria += 1;
          phongMap[phong].bvCompleted += bvCompleted ? 1 : 0;
          phongMap[phong].doanCompleted += doanCompleted ? 1 : 0;
          phongMap[phong].diffCount += diff !== 0 ? 1 : 0;
          phongMap[phong].remainingDoan += doanCompleted ? 0 : 1;

          if (!bvCompleted || !doanCompleted || diff !== 0) {
            const reasons = [];
            let severity = 2;
            if (diff !== 0) {
              reasons.push('Ch\u00eanh ' + (diff > 0 ? '+' : '') + diff);
              severity = 0;
            }
            if (bvCompleted && !doanCompleted) {
              reasons.push('\u0110o\u00e0n ' + doanScored + '/' + totalItems);
              severity = Math.min(severity, 1);
            } else if (!bvCompleted) {
              reasons.push('BV ' + bvScored + '/' + totalItems);
            }
            attentionRows.push({
              khoa: khoaName,
              maTC: maTC,
              noiDung: metaInfo.noiDung || 'Ch\u01b0a c\u00f3 n\u1ed9i dung ti\u00eau ch\u00ed',
              phong: phong,
              reason: reasons.join(' | '),
              lastUpdated: lastUpdated,
              lastUpdatedMs: lastUpdatedMs,
              diff: diff,
              severity: severity
            });
          }

          if (lastUpdatedMs > 0) {
            recentRows.push({
              khoa: khoaName,
              maTC: maTC,
              phong: phong,
              trangThai: String(sheetRow[3] || 'Ch\u01b0a ch\u1ea5m').trim(),
              lastUpdated: lastUpdated,
              lastUpdatedMs: lastUpdatedMs,
              bvCompleted: bvCompleted,
              doanCompleted: doanCompleted,
              diff: diff
            });
          }
        } catch (err) {
          // Skip malformed criteria rows but keep dashboard usable.
        }
      });

      stats.totalDepartments = Object.keys(departmentMap).length;
      stats.lastUpdated = formatDateTimeForClient_(latestUpdated);
      stats.lastUpdatedMs = latestUpdated && !isNaN(latestUpdated.getTime()) ? latestUpdated.getTime() : 0;
      status.fullyDone = stats.bothCompleted;
      status.diff = stats.diffCount;

      const departments = Object.keys(departmentMap)
        .map(key => {
          const item = departmentMap[key];
          item.bvPercent = dashboardPercent_(item.bvCompleted, item.totalCriteria);
          item.doanPercent = dashboardPercent_(item.doanCompleted, item.totalCriteria);
          item.donePercent = dashboardPercent_(item.bothCompleted, item.totalCriteria);
          item.scoreBVPercent = dashboardPercent_(item.totalBV, item.totalMax);
          item.scoreDoanPercent = dashboardPercent_(item.totalDoan, item.totalMax);
          item.remainingDoan = item.totalCriteria - item.doanCompleted;
          return item;
        })
        .sort((a, b) => {
          if (b.remainingDoan !== a.remainingDoan) return b.remainingDoan - a.remainingDoan;
          if (b.diffCount !== a.diffCount) return b.diffCount - a.diffCount;
          return a.khoa.localeCompare(b.khoa);
        });

      const phongs = Object.keys(phongMap)
        .map(key => {
          const item = phongMap[key];
          item.bvPercent = dashboardPercent_(item.bvCompleted, item.totalCriteria);
          item.doanPercent = dashboardPercent_(item.doanCompleted, item.totalCriteria);
          item.remainingDoan = item.totalCriteria - item.doanCompleted;
          return item;
        })
        .sort((a, b) => {
          if (b.remainingDoan !== a.remainingDoan) return b.remainingDoan - a.remainingDoan;
          if (b.diffCount !== a.diffCount) return b.diffCount - a.diffCount;
          if (b.totalCriteria !== a.totalCriteria) return b.totalCriteria - a.totalCriteria;
          return a.phong.localeCompare(b.phong);
        })
        .slice(0, 8);

      attentionRows.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity - b.severity;
        return b.lastUpdatedMs - a.lastUpdatedMs;
      });
      recentRows.sort((a, b) => b.lastUpdatedMs - a.lastUpdatedMs);

      let auditRows = [];
      if (auth.user && auth.user.role === 'Admin') {
        const auditRes = getAuditLog(sessionToken, 8);
        if (auditRes && auditRes.success && Array.isArray(auditRes.data)) {
          auditRows = auditRes.data;
        }
      }

      perfDetails.rows = stats.totalCriteria;
      perfDetails.departments = stats.totalDepartments;

      return {
        success: true,
        data: {
          scopeLabel: getDashboardScopeLabel_(auth.user),
          generatedAt: formatDateTimeForClient_(new Date()),
          generatedAtMs: Date.now(),
          stats: stats,
          progress: {
            bvPercent: dashboardPercent_(stats.bvCompleted, stats.totalCriteria),
            doanPercent: dashboardPercent_(stats.doanCompleted, stats.totalCriteria),
            donePercent: dashboardPercent_(stats.bothCompleted, stats.totalCriteria),
            scoreBVPercent: dashboardPercent_(stats.totalBV, stats.totalMax),
            scoreDoanPercent: dashboardPercent_(stats.totalDoan, stats.totalMax)
          },
          status: status,
          departments: departments.slice(0, 10),
          phongs: phongs,
          attentionRows: attentionRows.slice(0, 10).map(row => {
            delete row.severity;
            return row;
          }),
          recentRows: recentRows.slice(0, 8),
          auditRows: auditRows
        }
      };
    });
  } catch (e) {
    perfDetails.error = e.message;
    return { success: false, message: 'Loi tai dashboard tong quan: ' + e.message };
  } finally {
    logApiPerformance_(perfUser, 'getDashboardOverview', 'Dashboard', perfStart, perfDetails, PERF_LOG_DEFAULT_THRESHOLD_MS);
  }
}
