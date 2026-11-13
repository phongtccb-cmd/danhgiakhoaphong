/**
 * 080_Admin.js
 * Administration, health checks, setup, and migrations.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function buildConfigUserForDebug_(username, preferredRole) {
  const allRows = getConfigRows_(true);
  const user = allRows
    .filter(row => row.loai === 'USER')
    .find(row => sameText_(row.ma, username) || sameText_(row.ten, username));
  if (!user) return { success: false, message: 'Không tìm thấy user trong Config_83TC.' };

  const activeRows = allRows.filter(row => row.active);
  const roles = parseUserRoles_(user.giaTri2);
  const role = roles.includes(preferredRole) ? preferredRole : (roles.includes('DoanKT') ? 'DoanKT' : roles[0]);
  const hasAdmin = roles.includes('Admin');
  const baseAssignments = buildAssignmentsForConfigUser_(activeRows, user);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const settingsAssignments = getSettingsAssignmentsForUser_(ss, user.ma, user.ten || user.ma);
  const mergedAssignments = mergeAssignments_(baseAssignments, settingsAssignments);
  const phanCong = hasAdmin ? [{ khoa: 'All', phong: 'All' }] : mergedAssignments;

  return {
    success: true,
    data: {
      username: user.ma,
      name: user.ten || user.ma,
      active: user.active,
      phong: user.ghiChu,
      role: role,
      activeRole: role,
      roles: roles,
      quyenTruyCap: hasAdmin ? ['All'] : uniqueValues_(phanCong.map(item => item.khoa)),
      phanCong: phanCong,
      phongDuocGiao: hasAdmin ? ['All'] : uniqueValues_(phanCong.map(item => item.phong)),
      configRow: adminRowForClient_(user)
    }
  };
}

function getConfigSheetData_() {
  const sheet = getConfigSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const colCount = Math.max(sheet.getLastColumn(), CONFIG_HEADERS.length);
  const data = sheet.getRange(1, 1, lastRow, colCount).getValues();
  const headers = data[0].map(header => String(header || '').trim());
  const getIdx = name => headers.indexOf(name);
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

  return data.slice(1).map((row, index) => {
    const getCell = key => idx[key] === -1 ? '' : row[idx[key]];
    return {
      rowNumber: index + 2,
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
  }).filter(row => row.loai);
}

function adminRowForClient_(row) {
  return {
    rowNumber: row.rowNumber,
    loai: row.loai,
    ma: row.ma,
    ten: row.ten,
    giaTri1: row.loai === 'USER' ? '' : row.giaTri1,
    hasPassword: row.loai === 'USER' && !!row.giaTri1,
    giaTri2: row.giaTri2,
    danhSach: row.danhSach,
    thuTu: row.thuTu,
    active: row.active,
    ghiChu: row.ghiChu
  };
}

function getAdminConfigData(sessionToken) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;

    ensureDefaultAppConfigRows_();
    const rows = getConfigSheetData_();
    const settings = sortConfigRows_(rows.filter(row => row.loai === 'APP')).map(adminRowForClient_);
    const users = sortConfigRows_(rows.filter(row => row.loai === 'USER')).map(adminRowForClient_);
    const departments = sortConfigRows_(rows.filter(row => row.loai === 'KHOA')).map(adminRowForClient_);
    const phongs = sortConfigRows_(rows.filter(row => row.loai === 'PHONG')).map(adminRowForClient_);
    const assignments = sortConfigRows_(rows.filter(row => row.loai === 'PHANCONG')).map(adminRowForClient_);

    return {
      success: true,
      data: {
        settings: settings,
        users: users,
        departments: departments,
        phongs: phongs,
        assignments: assignments,
        roles: ['Admin', 'TruongNhom', 'ThuKi', 'DoanKT', 'DoanXN', 'Khoa']
      }
    };
  } catch (e) {
    return { success: false, message: 'Lỗi tải cấu hình Admin: ' + e.message };
  }
}

function debugAdminUserAccess(sessionToken, payload) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;

    const username = String(payload && payload.username || '').trim();
    const khoa = String(payload && payload.khoa || '').trim();
    const phong = String(payload && payload.phong || '').trim();
    const criteriaInput = String(payload && payload.criteria || '').trim();
    const preferredRole = String(payload && payload.role || 'DoanKT').trim();

    if (!username) return { success: false, message: 'Vui lòng nhập user cần kiểm tra.' };
    if (!khoa) return { success: false, message: 'Vui lòng nhập khoa cần kiểm tra.' };

    const userRes = buildConfigUserForDebug_(username, preferredRole);
    if (!userRes.success) return userRes;

    const debugUser = userRes.data;
    const hasKhoa = hasKhoaAccess_(debugUser, khoa);
    const hasPhong = phong ? hasPhongAccess_(debugUser, khoa, phong) : false;
    const assignedPhongs = getAssignedPhongsForUser_(debugUser, khoa);
    const reasons = [];

    if (!debugUser.active) reasons.push('User đang bị tắt trong Config_83TC.');
    if (!hasKhoa) reasons.push('User chưa có quyền truy cập khoa này.');
    if (phong && !hasPhong) reasons.push('User chưa được phân công phòng này trong khoa đang chọn.');
    if (!phong) reasons.push('Chưa nhập phòng phụ trách nên chưa kiểm được quyền phòng.');

    const result = {
      user: {
        username: debugUser.username,
        name: debugUser.name,
        active: debugUser.active,
        role: debugUser.role,
        roles: debugUser.roles,
        workplace: debugUser.phong
      },
      input: {
        khoa: khoa,
        phong: phong,
        criteria: criteriaInput
      },
      access: {
        hasKhoaAccess: hasKhoa,
        hasPhongAccess: hasPhong,
        canSaveByScope: !!(debugUser.active && hasKhoa && (!phong || hasPhong)),
        assignedPhongs: assignedPhongs,
        assignedDepartments: debugUser.quyenTruyCap,
        assignments: debugUser.phanCong
      },
      criteria: null,
      reasons: reasons
    };

    if (criteriaInput) {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const criteriaDict = getCriteriaMetadataDict_(ss);
      const departments = getDepartmentsForList_();
      const dataSheet = ss.getSheetByName(SHEET_NAME);
      const normalizedCriteria = foldText_(criteriaInput);
      let matchedRows = 0;
      let matchedItems = 0;
      let allowedItems = 0;
      const itemPhongs = {};
      let sample = null;

      if (dataSheet && dataSheet.getLastRow() >= 2) {
        const rows = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 8).getValues();
        rows.forEach(row => {
          const jsonStr = row[2];
          if (!jsonStr) return;
          try {
            const jsonObj = mergeChecklistWithEvidence_(jsonStr, row[7], criteriaDict, row[1]);
            const maGop = getEffectiveMaGop_(row[1], jsonObj);
            const maTC = getCriteriaCodeFromMaGop_(maGop);
            const dept = resolveDepartmentFromMaGop_(maGop, departments);
            const khoaName = dept ? dept.name : String(row[6] || '').trim();
            const matchesCriteria = sameText_(maTC, criteriaInput) || sameText_(maGop, criteriaInput) || foldText_(maGop).indexOf(normalizedCriteria) >= 0;
            if (!matchesCriteria || !accessValueMatchesDepartment_(khoa, khoaName, dept && dept.code)) return;

            matchedRows += 1;
            const items = Array.isArray(jsonObj && jsonObj.ChiTiet) ? jsonObj.ChiTiet : [];
            items.forEach(item => {
              const itemPhong = String(item.phong || jsonObj.phong || '').trim();
              if (itemPhong) itemPhongs[itemPhong] = true;
              if (!phong || isSamePhong_(itemPhong, phong)) {
                matchedItems += 1;
                if (hasPhongAccess_(debugUser, khoaName, itemPhong)) allowedItems += 1;
              }
            });
            if (!sample) {
              sample = {
                id_ketqua: getEffectiveIdKetQua_(row[0], jsonObj),
                magop: maGop,
                maTC: maTC,
                khoa: khoaName,
                rowPhong: jsonObj.phong || '',
                rowNguoiCham: jsonObj.nguoicham || row[5] || ''
              };
            }
          } catch (e) {}
        });
      }

      result.criteria = {
        matchedRows: matchedRows,
        matchedItems: matchedItems,
        allowedItems: allowedItems,
        itemPhongs: Object.keys(itemPhongs).sort(),
        sample: sample
      };
      if (matchedRows === 0) result.reasons.push('Không tìm thấy dòng Data_JSON khớp khoa/tiêu chí đã nhập.');
      if (matchedRows > 0 && matchedItems === 0) result.reasons.push('Tìm thấy tiêu chí nhưng không có tiểu mục khớp phòng đã nhập.');
      if (matchedItems > 0 && allowedItems === 0) result.reasons.push('Có tiểu mục khớp phòng nhưng user không có quyền cập nhật tiểu mục nào.');
    }

    logAudit_(auth.user, 'ADMIN_DEBUG_ACCESS', username + ' / ' + khoa + (phong ? ' / ' + phong : ''), {
      criteria: criteriaInput,
      hasKhoaAccess: result.access.hasKhoaAccess,
      hasPhongAccess: result.access.hasPhongAccess,
      allowedItems: result.criteria && result.criteria.allowedItems
    });

    return { success: true, data: result };
  } catch (e) {
    return { success: false, message: 'Lỗi kiểm tra quyền: ' + e.message };
  }
}

function findConfigRowByRowNumber_(rowNumber) {
  const row = Number(rowNumber);
  if (!row || row < 2) return null;

  const sheet = getConfigSheet_();
  if (row > sheet.getLastRow()) return null;

  const values = sheet.getRange(row, 1, 1, CONFIG_HEADERS.length).getValues()[0];
  return {
    rowNumber: row,
    loai: normalizeConfigType_(values[0]),
    ma: String(values[1] || '').trim(),
    ten: String(values[2] || '').trim(),
    giaTri1: String(values[3] || '').trim(),
    giaTri2: String(values[4] || '').trim(),
    danhSach: String(values[5] || '').trim(),
    thuTu: Number(values[6]) || 9999,
    active: isConfigRowActive_(values[7]),
    ghiChu: String(values[8] || '').trim()
  };
}

function normalizeAdminPayload_(payload, existingRow) {
  const type = normalizeConfigType_(payload && payload.loai);
  const allowedTypes = ['APP', 'USER', 'KHOA', 'PHONG', 'PHANCONG'];
  if (!allowedTypes.includes(type)) {
    throw new Error('Loại cấu hình không hợp lệ.');
  }

  const active = payload.active === false ? false : true;
  const order = Number(payload.thuTu) || (existingRow && existingRow.thuTu) || 9999;
  const note = String(payload.ghiChu || '').trim();

  if (type === 'APP') {
    const key = String(payload.ma || '').trim();
    const label = String(payload.ten || key).trim();
    const value = String(payload.giaTri1 || '').trim();
    if (!key) throw new Error('Cài đặt cần có mã.');
    return ['APP', key, label, value, '', '', order, active, note];
  }

  if (type === 'USER') {
    const username = String(payload.ma || '').trim();
    if (!username) throw new Error('Username không được để trống.');

    const password = String(payload.password || '').trim();
    const passwordValue = password
      ? hashPassword_(password)
      : (existingRow ? existingRow.giaTri1 : '');
    if (!passwordValue) throw new Error('Mật khẩu là bắt buộc khi tạo user mới.');

    const roles = parseUserRoles_(payload.giaTri2 || 'DoanKT');
    const roleText = roles.join(', ');
    const accessList = roles.includes('Admin') ? 'All' : String(payload.danhSach || '').trim();

    return ['USER', username, String(payload.ten || username).trim(), passwordValue, roleText, accessList, order, active, note];
  }

  if (type === 'KHOA') {
    const code = String(payload.ma || payload.giaTri1 || '').trim();
    const name = String(payload.ten || '').trim();
    if (!code || !name) throw new Error('Khoa cần có mã và tên hiển thị.');
    return ['KHOA', code, name, code, '', '', order, active, note];
  }

  if (type === 'PHONG') {
    const value = String(payload.ma || payload.giaTri1 || '').trim();
    const label = String(payload.ten || value).trim();
    if (!value) throw new Error('Phòng phụ trách cần có mã/giá trị.');
    return ['PHONG', value, label, value, '', '', order, active, note];
  }

  const username = String(payload.ma || '').trim();
  const khoaList = String(payload.giaTri1 || payload.danhSach || '').trim();
  const phong = String(payload.giaTri2 || '').trim();
  if (!username || !khoaList) throw new Error('Phân công cần có username và danh sách khoa.');
  return ['PHANCONG', username, String(payload.ten || '').trim(), khoaList, phong, '', order, active, note];
}

function saveAdminConfigRow(sessionToken, payload) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;

    const sheet = getConfigSheet_();
    const existingRow = payload && payload.rowNumber ? findConfigRowByRowNumber_(payload.rowNumber) : null;
    const rowValues = normalizeAdminPayload_(payload || {}, existingRow);
    const mode = existingRow ? 'update' : 'create';

    if (existingRow) {
      sheet.getRange(existingRow.rowNumber, 1, 1, CONFIG_HEADERS.length).setValues([rowValues]);
    } else {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, CONFIG_HEADERS.length).setValues([rowValues]);
    }

    sheet.autoResizeColumns(1, CONFIG_HEADERS.length);
    SpreadsheetApp.flush();
    invalidateConfigCaches_();
    logAudit_(auth.user, 'ADMIN_CONFIG_SAVE', rowValues[0] + ':' + rowValues[1], {
      mode: mode,
      rowNumber: existingRow ? existingRow.rowNumber : sheet.getLastRow(),
      loai: rowValues[0],
      ma: rowValues[1],
      ten: rowValues[2],
      roleOrPhong: rowValues[4],
      danhSach: rowValues[5],
      active: rowValues[7]
    });
    return { success: true, message: 'Đã lưu cấu hình thành công.' };
  } catch (e) {
    return { success: false, message: 'Lỗi lưu cấu hình: ' + e.message };
  }
}

function setAdminConfigRowActive(sessionToken, rowNumber, active) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;

    const row = findConfigRowByRowNumber_(rowNumber);
    if (!row) return { success: false, message: 'Không tìm thấy dòng cấu hình.' };

    const sheet = getConfigSheet_();
    sheet.getRange(row.rowNumber, 8).setValue(active === false ? false : true);
    SpreadsheetApp.flush();
    invalidateConfigCaches_();
    logAudit_(auth.user, 'ADMIN_CONFIG_STATUS', row.loai + ':' + row.ma, {
      rowNumber: row.rowNumber,
      active: active === false ? false : true
    });
    return { success: true, message: active === false ? 'Đã tắt cấu hình.' : 'Đã bật cấu hình.' };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật trạng thái: ' + e.message };
  }
}

function syncAdminPhongFromSettings(sessionToken) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;
    const result = capNhatConfigTuSettings83TC_();
    invalidateConfigCaches_();
    if (result && result.success) {
      logAudit_(auth.user, 'ADMIN_SYNC_SETTINGS', 'Config_83TC', {
        added: result.added || 0,
        totalPhongFromSettings: result.totalPhongFromSettings || 0
      });
    }
    return result;
  } catch (e) {
    return { success: false, message: 'Lỗi đồng bộ Settings: ' + e.message };
  }
}

function clearAdminRuntimeCache(sessionToken) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;

    [
      CACHE_SCOPE_CONFIG,
      CACHE_SCOPE_SETTINGS,
      CACHE_SCOPE_DEPARTMENT,
      CACHE_SCOPE_DATA,
      CACHE_SCOPE_ROW_INDEX
    ].forEach(invalidateAppCache_);
    const propertyCleanup = cleanupObsoleteCacheVersionProperties_();

    logAudit_(auth.user, 'ADMIN_CLEAR_CACHE', 'runtime-cache', {
      deletedProperties: propertyCleanup.deleted || 0
    });
    return { success: true, message: 'Đã làm mới cache vận hành và dọn ' + (propertyCleanup.deleted || 0) + ' thuộc tính cache cũ. Dữ liệu sẽ được nạp lại ở lần truy cập tiếp theo.' };
  } catch (e) {
    return { success: false, message: 'Lỗi clear cache: ' + e.message };
  }
}

function getAdminHealthCheck(sessionToken) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = getConfigSheet_();
    const dataSheet = ss.getSheetByName(SHEET_NAME);
    const auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    const settingsCheck = kiemTraSettings83TC_();
    const configRows = getConfigSheetData_();
    const byType = {};
    configRows.forEach(row => {
      byType[row.loai] = (byType[row.loai] || 0) + 1;
    });

    const warnings = [];
    if (!dataSheet) warnings.push('Chưa có sheet ' + SHEET_NAME + '.');
    if (!settingsCheck.success) warnings.push(settingsCheck.message);
    if (!byType.USER) warnings.push('Chưa có user trong Config_83TC.');
    if (!byType.KHOA) warnings.push('Chưa có khoa trong Config_83TC.');
    if (!byType.PHONG) warnings.push('Chưa có phòng phụ trách trong Config_83TC.');

    const dataRows = dataSheet ? Math.max(dataSheet.getLastRow() - 1, 0) : 0;
    const auditRows = auditSheet ? Math.max(auditSheet.getLastRow() - 1, 0) : 0;
    const health = {
      spreadsheetId: SPREADSHEET_ID,
      configSheet: configSheet.getName(),
      dataSheet: dataSheet ? dataSheet.getName() : '',
      dataRows: dataRows,
      auditRows: auditRows,
      configCounts: byType,
      settings: settingsCheck.success ? {
        ok: true,
        sheetName: settingsCheck.sheetName,
        soTieuChi: settingsCheck.soTieuChi,
        soPhongPhuTrach: settingsCheck.soPhongPhuTrach
      } : {
        ok: false,
        message: settingsCheck.message
      },
      appSettings: getAppSettings_(),
      dashboardCacheTtlSeconds: CACHE_TTL_DASHBOARD_SECONDS,
      runtimeProperties: getRuntimePropertyStats_(),
      performance: buildApiPerformanceStats_(1000),
      warnings: warnings,
      checkedAt: formatDateTimeForClient_(new Date())
    };

    logAudit_(auth.user, 'ADMIN_HEALTH_CHECK', 'system', {
      warnings: warnings.length,
      dataRows: dataRows,
      configCounts: byType
    });
    return { success: true, data: health };
  } catch (e) {
    return { success: false, message: 'Lỗi kiểm tra hệ thống: ' + e.message };
  }
}

// Historical data migration

function migrateOldDatabaseToSplitSchema_() {
  const sheet = getDbSheet_();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    Logger.log("Bảng Data_JSON trống, không có gì để chuyển đổi.");
    return;
  }
  
  const range = sheet.getRange(2, 1, lastRow - 1, 8);
  const data = range.getValues();
  let migrationCount = 0;
  
  Logger.log("Bắt đầu tiến trình chuyển đổi cơ sở dữ liệu cho " + (lastRow - 1) + " dòng...");
  
  for (let i = 0; i < data.length; i++) {
    const rowIndex = i + 2;
    const jsonStr = data[i][2]; // Cột C
    
    if (!jsonStr) continue;
    
    try {
      const criteriaObj = JSON.parse(jsonStr);
      const idKetQua = getEffectiveIdKetQua_(data[i][0], criteriaObj);
      const items = getCriteriaItems_(criteriaObj);
      if (criteriaObj && items.length > 0) {
        
        const mcJsonObj = { ID_ketqua: idKetQua, ChiTietMC: [] };
        let hasEvidence = false;
        
        const migratedItems = items.map(item => {
          const m_bv = normalizeEvidenceText_(item.minhchung_bv !== undefined ? item.minhchung_bv : item.Minhchung);
          const m_doan = normalizeEvidenceText_(item.minhchung_doan);
          
          if (m_bv.trim() !== "" || m_doan.trim() !== "") {
            mcJsonObj.ChiTietMC.push({
              id: item.id,
              minhchung_bv: m_bv,
              minhchung_doan: m_doan
            });
            hasEvidence = true;
          }
          
          delete item.Minhchung;
          delete item.minhchung_bv;
          delete item.minhchung_doan;
          
          return item;
        });

        if (Array.isArray(criteriaObj.ChiTiet)) {
          criteriaObj.ChiTiet = migratedItems;
        } else if (Array.isArray(criteriaObj.danh_sach_muc_do)) {
          criteriaObj.danh_sach_muc_do = migratedItems;
        } else if (Array.isArray(criteriaObj.danhSachMucDo)) {
          criteriaObj.danhSachMucDo = migratedItems;
        }
        
        const storageCriteriaObj = dehydrateCriteriaForStorage_(normalizeCriteriaObject_(criteriaObj));
        sheet.getRange(rowIndex, 3).setValue(JSON.stringify(storageCriteriaObj));
        
        if (hasEvidence) {
          sheet.getRange(rowIndex, 8).setValue(JSON.stringify(mcJsonObj));
        } else {
          sheet.getRange(rowIndex, 8).setValue(JSON.stringify({ ID_ketqua: idKetQua, ChiTietMC: [] }));
        }
        
        migrationCount++;
      }
    } catch (err) {
      Logger.log("Bỏ qua dòng " + rowIndex + " do lỗi cấu trúc JSON: " + err.message);
    }
  }
  
  SpreadsheetApp.flush();
  Logger.log("Chuyển đổi hoàn tất thành công cho " + migrationCount + " dòng dữ liệu!");
}
