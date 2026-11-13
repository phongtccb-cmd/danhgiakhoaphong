/**
 * 030_Auth.js
 * Authentication, sessions, roles, and access control.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function normalizeUserRole_(value) {
  const key = foldText_(value);
  if (['admin', 'quan tri', 'quan tri vien', 'administrator'].includes(key)) return 'Admin';
  if (['truong nhom', 'truongnhom', 'leader', 'team leader', 'nhom truong', 'nhomtruong'].includes(key)) return 'TruongNhom';
  if (['thu ki', 'thu ky', 'thuki', 'thuky', 'secretary', 'secretariat'].includes(key)) return 'ThuKi';
  if (['doanxn', 'doan xn', 'xet nghiem', 'xetnghiem', 'doan xet nghiem', 'doan kiem tra xet nghiem', '2429'].includes(key)) return 'DoanXN';
  if (['khoa', 'khong', 'khong doan', 'tu cham', 'none', 'no'].includes(key)) return 'Khoa';
  return 'DoanKT';
}

function parseUserRoles_(value) {
  const parts = Array.isArray(value) ? value : splitConfigList_(String(value || ''));
  const roles = uniqueValues_(parts.map(normalizeUserRole_)).filter(Boolean);
  return roles.length > 0 ? roles : ['DoanKT'];
}

function userHasRole_(user, role) {
  const roles = Array.isArray(user && user.roles) ? user.roles : parseUserRoles_(user && user.role);
  return roles.includes(role);
}

function getUserEffectiveChecklistRole_(user) {
  if (!user) return 'Khoa';
  return normalizeActiveRole_(user.activeRole || user.role, user.roles || user.role);
}

function shouldRequireLoginRoleSelection_(roles) {
  const normalizedRoles = parseUserRoles_(roles);
  return normalizedRoles.includes('DoanKT') && normalizedRoles.includes('Khoa');
}

function getLoginSelectableRoles_(roles) {
  const normalizedRoles = parseUserRoles_(roles);
  if (!shouldRequireLoginRoleSelection_(normalizedRoles)) return [];
  return ['DoanKT', 'Khoa'].filter(role => normalizedRoles.includes(role));
}

function userCanViewDashboard_(user) {
  return user && (userHasRole_(user, 'TruongNhom') || userHasRole_(user, 'ThuKi'));
}

function normalizeActiveRole_(role, roles) {
  const normalizedRoles = parseUserRoles_(roles);
  const requested = normalizeUserRole_(role || normalizedRoles[0]);
  return normalizedRoles.includes(requested) ? requested : normalizedRoles[0];
}

const SESSION_PREFIX = 'SESSION_V1_';
const SESSION_PROP_PREFIX = 'SESSION_STORE_V1_';
const SESSION_TTL_SECONDS = 60 * 60;
const PENDING_LOGIN_PREFIX = 'PENDING_LOGIN_V1_';
const PENDING_LOGIN_TTL_SECONDS = 10 * 60;
const PASSWORD_MIN_LENGTH = 8;
const ALLOW_LEGACY_PASSWORD_LOGIN = true;
const LOGIN_RATE_LIMIT_MAX_FAILURES = 5;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

function bytesToHex_(bytes) {
  return bytes.map(byte => {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function sha256Hex_(value) {
  return bytesToHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  ));
}

function makePasswordSalt_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function hashPassword_(password) {
  const salt = makePasswordSalt_();
  return 'sha256$' + salt + '$' + sha256Hex_(salt + ':' + String(password || ''));
}

function normalizeLoginName_(username) {
  return foldText_(username).replace(/\s+/g, '');
}

function getLoginRateLimitKey_(username) {
  const normalized = normalizeLoginName_(username) || 'blank';
  return APP_CACHE_PREFIX + ':LOGIN_FAIL:' + sha256Hex_(normalized);
}

function getLoginRateLimit_(username) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get(getLoginRateLimitKey_(username));
  if (!raw) return { count: 0, lockedUntil: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed.count || 0),
      lockedUntil: Number(parsed.lockedUntil || 0)
    };
  } catch (e) {
    return { count: 0, lockedUntil: 0 };
  }
}

function checkLoginRateLimit_(username) {
  const state = getLoginRateLimit_(username);
  const now = Date.now();
  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      success: false,
      code: 'LOGIN_RATE_LIMITED',
      lockedUntil: state.lockedUntil,
      retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
      message: 'Tài khoản đang tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ít phút.'
    };
  }
  return { success: true };
}

function recordLoginFailure_(username) {
  const cache = CacheService.getScriptCache();
  const key = getLoginRateLimitKey_(username);
  const state = getLoginRateLimit_(username);
  const count = Number(state.count || 0) + 1;
  const lockedUntil = count >= LOGIN_RATE_LIMIT_MAX_FAILURES
    ? Date.now() + LOGIN_RATE_LIMIT_WINDOW_SECONDS * 1000
    : 0;
  cache.put(key, JSON.stringify({ count: count, lockedUntil: lockedUntil }), LOGIN_RATE_LIMIT_WINDOW_SECONDS);
  return {
    count: count,
    lockedUntil: lockedUntil,
    retryAfterSeconds: lockedUntil ? LOGIN_RATE_LIMIT_WINDOW_SECONDS : 0
  };
}

function clearLoginFailures_(username) {
  CacheService.getScriptCache().remove(getLoginRateLimitKey_(username));
}

function getSessionKey_(token) {
  return SESSION_PREFIX + sha256Hex_(token);
}

function getSessionStoreKey_(token) {
  return SESSION_PROP_PREFIX + sha256Hex_(token);
}

function putSession_(token, sessionUser) {
  const raw = JSON.stringify(sessionUser);
  CacheService.getScriptCache().put(getSessionKey_(token), raw, SESSION_TTL_SECONDS);
  PropertiesService.getScriptProperties().setProperty(getSessionStoreKey_(token), raw);
}

function getStoredSession_(token) {
  const cache = CacheService.getScriptCache();
  const cacheKey = getSessionKey_(token);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const raw = PropertiesService.getScriptProperties().getProperty(getSessionStoreKey_(token));
  if (raw) {
    cache.put(cacheKey, raw, SESSION_TTL_SECONDS);
  }
  return raw;
}

function removeStoredSession_(token) {
  CacheService.getScriptCache().remove(getSessionKey_(token));
  PropertiesService.getScriptProperties().deleteProperty(getSessionStoreKey_(token));
}

function sanitizeUserForSession_(userData) {
  const roles = parseUserRoles_(userData.roles || userData.role);
  const activeRole = normalizeActiveRole_(userData.activeRole || userData.role, roles);
  const workplace = String(userData.phong || '').trim();
  const phanCong = Array.isArray(userData.phanCong) ? userData.phanCong : [];
  let quyenTruyCap = Array.isArray(userData.quyenTruyCap) ? uniqueValues_(userData.quyenTruyCap) : [];
  if (quyenTruyCap.length === 0 && phanCong.length === 0 && workplace) {
    quyenTruyCap = [workplace];
  }

  return {
    username: String(userData.username || '').trim(),
    name: String(userData.name || userData.username || '').trim(),
    phong: workplace,
    role: activeRole,
    activeRole: activeRole,
    roles: roles,
    quyenTruyCap: quyenTruyCap,
    phanCong: phanCong,
    phongDuocGiao: Array.isArray(userData.phongDuocGiao) ? userData.phongDuocGiao : []
  };
}

function buildClientUser_(sessionUser, token) {
  const user = sanitizeUserForSession_(sessionUser);
  user.sessionToken = token || '';
  user.sessionExpiresAt = sessionUser.sessionExpiresAt || sessionUser.expiresAt || 0;
  return user;
}

function cleanupExpiredSessions_() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const now = Date.now();
  const keysToDelete = [];

  Object.keys(allProps).forEach(key => {
    if (key.indexOf(SESSION_PROP_PREFIX) !== 0) return;
    try {
      const sessionUser = JSON.parse(allProps[key] || '{}');
      if (!sessionUser.expiresAt || Number(sessionUser.expiresAt) <= now) {
        keysToDelete.push(key);
      }
    } catch (e) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => props.deleteProperty(key));
  return true;
}

function createSessionForUser_(userData, activeRole) {
  cleanupExpiredSessions_();

  const token = Utilities.getUuid() + '.' + Utilities.getUuid();
  const now = Date.now();
  const sessionUser = sanitizeUserForSession_(Object.assign({}, userData || {}, {
    activeRole: activeRole || userData.activeRole || userData.role
  }));
  sessionUser.createdAt = now;
  sessionUser.lastSeenAt = now;
  sessionUser.expiresAt = now + SESSION_TTL_SECONDS * 1000;
  sessionUser.sessionExpiresAt = sessionUser.expiresAt;

  putSession_(token, sessionUser);
  return {
    success: true,
    data: buildClientUser_(sessionUser, token)
  };
}

function createPendingLogin_(userData) {
  const token = Utilities.getUuid() + '.' + Utilities.getUuid();
  CacheService.getScriptCache().put(PENDING_LOGIN_PREFIX + sha256Hex_(token), JSON.stringify(userData), PENDING_LOGIN_TTL_SECONDS);
  return token;
}

function consumePendingLogin_(pendingToken) {
  const token = String(pendingToken || '').trim();
  if (!token) return null;
  const key = PENDING_LOGIN_PREFIX + sha256Hex_(token);
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);
  if (!raw) return null;
  cache.remove(key);
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function unauthorizedResponse_(message) {
  return {
    success: false,
    authRequired: true,
    code: 'AUTH_REQUIRED',
    message: message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  };
}

function forbiddenResponse_(message) {
  return {
    success: false,
    code: 'FORBIDDEN',
    message: message || 'Bạn không có quyền thực hiện thao tác này.'
  };
}

function requireSession_(sessionToken) {
  const token = String(sessionToken || '').trim();
  if (!token) return unauthorizedResponse_();

  const raw = getStoredSession_(token);
  if (!raw) return unauthorizedResponse_();

  try {
    const sessionUser = JSON.parse(raw);
    const now = Date.now();
    if (!sessionUser.expiresAt || Number(sessionUser.expiresAt) <= now) {
      removeStoredSession_(token);
      return unauthorizedResponse_();
    }

    sessionUser.lastSeenAt = now;
    sessionUser.expiresAt = now + SESSION_TTL_SECONDS * 1000;
    sessionUser.sessionExpiresAt = sessionUser.expiresAt;
    putSession_(token, sessionUser);

    return {
      success: true,
      user: sanitizeUserForSession_(sessionUser),
      sessionUser: sessionUser,
      token: token
    };
  } catch (e) {
    removeStoredSession_(token);
    return unauthorizedResponse_();
  }
}

function getCurrentSessionUser(sessionToken) {
  const auth = requireSession_(sessionToken);
  if (!auth.success) return auth;
  return {
    success: true,
    data: buildClientUser_(auth.sessionUser, auth.token)
  };
}

function logoutUser(sessionToken) {
  const auth = requireSession_(sessionToken);
  const token = String(sessionToken || '').trim();
  if (token) {
    removeStoredSession_(token);
  }
  if (auth.success) {
    logAudit_(auth.user, 'LOGOUT', auth.user.username, {});
  }
  return { success: true };
}

function changeMyPassword(sessionToken, currentPassword, newPassword) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;

    const oldPass = String(currentPassword || '');
    const nextPass = String(newPassword || '');
    if (!oldPass || !nextPass) {
      return { success: false, message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' };
    }
    if (nextPass.length < PASSWORD_MIN_LENGTH) {
      return { success: false, message: 'Mật khẩu mới cần tối thiểu ' + PASSWORD_MIN_LENGTH + ' ký tự.' };
    }
    if (oldPass === nextPass) {
      return { success: false, message: 'Mật khẩu mới không được trùng mật khẩu hiện tại.' };
    }

    const sheet = getConfigSheet_();
    const values = sheet.getDataRange().getValues();
    let targetRow = -1;
    let storedPassword = '';
    for (let i = 1; i < values.length; i++) {
      const loai = normalizeConfigType_(values[i][0]);
      const ma = String(values[i][1] || '').trim();
      const active = isConfigRowActive_(values[i][7]);
      if (loai === 'USER' && active && sameText_(ma, auth.user.username)) {
        targetRow = i + 1;
        storedPassword = String(values[i][3] || '').trim();
        break;
      }
    }

    if (targetRow === -1) {
      return { success: false, message: 'Không tìm thấy tài khoản trong Config_83TC. Vui lòng liên hệ Admin để migrate tài khoản vào Config.' };
    }
    if (!verifyPassword_(storedPassword, oldPass, auth.user.username)) {
      logAudit_(auth.user, 'PASSWORD_CHANGE_FAILED', auth.user.username, { reason: 'wrong_current_password' });
      return { success: false, message: 'Mật khẩu hiện tại không đúng.' };
    }

    sheet.getRange(targetRow, 4).setValue(hashPassword_(nextPass));
    SpreadsheetApp.flush();
    invalidateConfigCaches_();
    logAudit_(auth.user, 'PASSWORD_CHANGED', auth.user.username, { rowNumber: targetRow });

    return { success: true, message: 'Đã đổi mật khẩu thành công. Lần đăng nhập sau hãy dùng mật khẩu mới.' };
  } catch (e) {
    return { success: false, message: 'Lỗi đổi mật khẩu: ' + e.message };
  }
}

function verifyPassword_(storedPassword, providedPassword, username) {
  const stored = String(storedPassword || '').trim();
  const provided = String(providedPassword || '');
  if (stored.indexOf('sha256:') === 0) {
    return stored.slice(7).toLowerCase() === sha256Hex_(provided).toLowerCase();
  }
  if (stored.indexOf('sha256$') === 0) {
    const parts = stored.split('$');
    if (parts.length === 3) {
      return parts[2].toLowerCase() === sha256Hex_(parts[1] + ':' + provided).toLowerCase();
    }
  }
  if (!ALLOW_LEGACY_PASSWORD_LOGIN) return false;
  if (stored.indexOf('sha256_username:') === 0) {
    return stored.slice(16).toLowerCase() === sha256Hex_(String(username || '').trim() + ':' + provided).toLowerCase();
  }
  return stored === provided.trim();
}

function isLegacyPasswordHash_(storedPassword) {
  const stored = String(storedPassword || '').trim();
  return stored && stored.indexOf('sha256$') !== 0;
}

function upgradeConfigUserPasswordIfLegacy_(username, providedPassword, storedPassword, actor) {
  if (!isLegacyPasswordHash_(storedPassword)) return false;
  const sheet = getConfigSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const loai = normalizeConfigType_(values[i][0]);
    const ma = String(values[i][1] || '').trim();
    if (loai === 'USER' && sameText_(ma, username)) {
      sheet.getRange(i + 1, 4).setValue(hashPassword_(providedPassword));
      SpreadsheetApp.flush();
      invalidateConfigCaches_();
      logAudit_(actor || username, 'PASSWORD_HASH_UPGRADED', ma, { source: 'Config_83TC' });
      return true;
    }
  }
  return false;
}

function isAllAccessValue_(value) {
  const key = foldText_(value);
  return ['all', 'tat ca', 'toan bo', '*'].includes(key);
}

function userCanAccessAllKhoa_(user) {
  if (user && user.role === 'Admin') return true;
  return (Array.isArray(user.quyenTruyCap) ? user.quyenTruyCap : []).some(isAllAccessValue_);
}

function getUserAllowedKhoas_(user) {
  if (userCanAccessAllKhoa_(user)) return [];
  return uniqueValues_(Array.isArray(user.quyenTruyCap) ? user.quyenTruyCap : []);
}

function accessValueMatchesDepartment_(accessValue, departmentName, departmentCode) {
  const accessText = String(accessValue || '').trim();
  const name = String(departmentName || '').trim();
  const code = String(departmentCode || '').trim();
  if (!accessText) return false;

  if (name && sameText_(accessText, name)) return true;
  if (code && sameText_(accessText, code)) return true;

  const foldedAccess = foldText_(accessText);
  const foldedCode = foldText_(code);
  return foldedCode.length >= 2 && foldedAccess.indexOf(foldedCode) !== -1;
}

function hasKhoaAccess_(user, khoa) {
  const khoaText = String(khoa || '').trim();
  if (!khoaText) return false;
  if (userCanAccessAllKhoa_(user)) return true;

  const allowedKhoas = getUserAllowedKhoas_(user);
  const khoaCode = getDepartmentCode_(khoaText);
  if (allowedKhoas.some(allowed => accessValueMatchesDepartment_(allowed, khoaText, khoaCode))) return true;

  const workplace = String(user && user.phong || '').trim();
  if (accessValueMatchesDepartment_(workplace, khoaText, khoaCode)) return true;

  return false;
}

function hasDepartmentUnitAccess_(user, departmentUnit) {
  if (!departmentUnit) return false;
  if (userCanAccessAllKhoa_(user)) return true;

  const name = String(departmentUnit.name || '').trim();
  const code = String(departmentUnit.code || '').trim();
  const accessValues = getUserAllowedKhoas_(user)
    .concat([String(user && user.phong || '').trim()])
    .filter(Boolean);

  return accessValues.some(value => accessValueMatchesDepartment_(value, name, code));
}

function getAssignedPhongsForUser_(user, khoa) {
  const assignments = Array.isArray(user.phanCong) ? user.phanCong : [];
  const phongs = assignments
    .filter(item => !khoa || !item.khoa || isAllAccessValue_(item.khoa) || sameText_(item.khoa, khoa))
    .map(item => item.phong)
    .filter(Boolean);
  return uniqueValues_(phongs);
}

function hasPhongAccess_(user, khoa, phong) {
  if (user && user.role === 'Admin') return true;
  const phongText = String(phong || '').trim();
  if (!hasKhoaAccess_(user, khoa)) return false;
  if (getUserEffectiveChecklistRole_(user) === 'Khoa') return true;

  const assignedPhongs = getAssignedPhongsForUser_(user, khoa);
  if (assignedPhongs.some(isAllAccessValue_)) return true;
  if (!phongText) return assignedPhongs.length === 0;
  if (isAllAccessValue_(phongText)) return false;
  if (assignedPhongs.length === 0) return true;
  return assignedPhongs.some(assigned => sameText_(assigned, phongText));
}

function requireKhoaAccess_(user, khoa) {
  if (user && user.role === 'Admin') return { success: true };
  if (!hasKhoaAccess_(user, khoa)) {
    return forbiddenResponse_('Bạn không có quyền truy cập khoa: ' + String(khoa || ''));
  }
  return { success: true };
}

function requireKhoaPhongAccess_(user, khoa, phong) {
  if (user && user.role === 'Admin') return { success: true };
  if (!hasKhoaAccess_(user, khoa)) {
    return forbiddenResponse_('Bạn không có quyền truy cập khoa: ' + String(khoa || ''));
  }
  if (!hasPhongAccess_(user, khoa, phong)) {
    return forbiddenResponse_('Bạn không có quyền truy cập phòng phụ trách: ' + String(phong || ''));
  }
  return { success: true };
}

function requireAdmin_(sessionToken) {
  const auth = requireSession_(sessionToken);
  if (!auth.success) return auth;
  if (!auth.user || auth.user.role !== 'Admin') {
    return forbiddenResponse_('Chỉ tài khoản Admin mới được truy cập cấu hình hệ thống.');
  }
  return auth;
}

function requireDashboardAccess_(sessionToken) {
  const auth = requireSession_(sessionToken);
  if (!auth.success) return auth;
  if (!auth.user || !userCanViewDashboard_(auth.user)) {
    return forbiddenResponse_('Chỉ Trưởng nhóm và Thư kí được truy cập Dashboard.');
  }
  return auth;
}

function loginUserFromConfig_(username, password) {
  const allRows = getConfigRows_(true);
  const users = allRows.filter(row => row.loai === 'USER');
  if (users.length === 0) return null;

  const user = users.find(row => sameText_(row.ma, username));
  if (!user) return { success: false, message: 'Không tìm thấy tên đăng nhập!' };
  if (!user.active) return { success: false, message: 'Tài khoản này đang bị tắt trong sheet Config_83TC.' };

  if (!verifyPassword_(user.giaTri1, password, username)) {
    return { success: false, message: 'Sai mật khẩu!' };
  }

  upgradeConfigUserPasswordIfLegacy_(user.ma, password, user.giaTri1, user.ma);

  const activeRows = allRows.filter(row => row.active);
  const assignments = buildAssignmentsForConfigUser_(activeRows, user);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const settingsAssignments = getSettingsAssignmentsForUser_(ss, user.ma, user.ten || user.ma);
  const mergedAssignments = mergeAssignments_(assignments, settingsAssignments);
  const roles = parseUserRoles_(user.giaTri2);
  const hasAdmin = roles.includes('Admin');
  const defaultRole = roles[0];
  const quyenTruyCap = hasAdmin ? ['All'] : uniqueValues_(mergedAssignments.map(item => item.khoa));

  return {
    success: true,
    data: {
      username: user.ma,
      name: user.ten || user.ma,
      phong: user.ghiChu,
      role: defaultRole,
      activeRole: defaultRole,
      roles: roles,
      quyenTruyCap: quyenTruyCap,
      phanCong: hasAdmin ? [{ khoa: 'All', phong: 'All' }] : mergedAssignments,
      phongDuocGiao: hasAdmin ? ['All'] : uniqueValues_(mergedAssignments.map(item => item.phong))
    }
  };
}

function loginUser(username, password) {
  const rateLimit = checkLoginRateLimit_(username);
  if (!rateLimit.success) {
    logAudit_(username, 'LOGIN_RATE_LIMITED', username, {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      lockedUntil: new Date(rateLimit.lockedUntil).toISOString()
    });
    return rateLimit;
  }

  const configLogin = loginUserFromConfig_(username, password);
  const loginResult = configLogin || loginUserFromUsersSheet_(username, password);
  if (loginResult && loginResult.success) {
    clearLoginFailures_(username);
    const roles = parseUserRoles_(loginResult.data.roles || loginResult.data.role);
    const selectableRoles = getLoginSelectableRoles_(roles);
    if (selectableRoles.length > 0) {
      const pendingUser = Object.assign({}, loginResult.data, { roles: roles });
      return {
        success: true,
        roleSelectionRequired: true,
        data: {
          pendingLoginToken: createPendingLogin_(pendingUser),
          username: pendingUser.username,
          name: pendingUser.name,
          roles: roles,
          selectableRoles: selectableRoles
        }
      };
    }
    const sessionResult = createSessionForUser_(Object.assign({}, loginResult.data, { roles: roles }), roles[0]);
    logAudit_(loginResult.data, 'LOGIN_SUCCESS', loginResult.data.username, {
      role: roles[0],
      roles: roles.join(',')
    });
    return sessionResult;
  }
  const failureState = recordLoginFailure_(username);
  logAudit_(username, 'LOGIN_FAILED', username, {
    message: loginResult && loginResult.message ? loginResult.message : 'Login failed',
    failureCount: failureState.count,
    locked: !!failureState.lockedUntil
  });
  if (failureState.lockedUntil) {
    return {
      success: false,
      code: 'LOGIN_RATE_LIMITED',
      retryAfterSeconds: failureState.retryAfterSeconds,
      message: 'Đăng nhập sai quá nhiều lần. Tài khoản tạm khóa trong 10 phút.'
    };
  }
  return loginResult;
}

function selectLoginRole(pendingLoginToken, selectedRole) {
  try {
    const pendingUser = consumePendingLogin_(pendingLoginToken);
    if (!pendingUser) {
      return unauthorizedResponse_('Phiên chọn vai trò đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const roles = parseUserRoles_(pendingUser.roles || pendingUser.role);
    const activeRole = normalizeActiveRole_(selectedRole, roles);
    const sessionResult = createSessionForUser_(pendingUser, activeRole);
    logAudit_(Object.assign({}, pendingUser, { role: activeRole }), 'LOGIN_SUCCESS', pendingUser.username, {
      role: activeRole,
      selectedFrom: roles.join(',')
    });
    return sessionResult;
  } catch (e) {
    return { success: false, message: 'Lỗi chọn vai trò: ' + e.message };
  }
}

function loginUserFromUsersSheet_(username, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName("Users"); 
    
    if (!userSheet) return { success: false, message: "Lỗi hệ thống: Chưa có Database Users" };
    
    const data = userSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim()); 
    
    const idxUser = headers.indexOf("Username"); 
    const idxPass = headers.indexOf("Mật khẩu");
    const idxName = headers.indexOf("Họ và tên");
    const idxPhong = headers.indexOf("Khoa Phòng công tác");
    const idxNhomKT = headers.indexOf("Nhóm kiểm tra"); 
    const idxQuyen = headers.indexOf("Quyền truy cập"); 
    
    if (idxUser === -1 || idxPass === -1 || idxName === -1) {
      return { 
        success: false, 
        message: "Lỗi cấu trúc Sheet Users! Vui lòng kiểm tra lại tiêu đề cột xem có khớp chính xác với (Username, Mật khẩu, Họ và tên) hay không." 
      };
    }
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[idxUser]).trim() === String(username).trim()) {
        if (verifyPassword_(row[idxPass], password, username)) {
          if (isLegacyPasswordHash_(row[idxPass])) {
            userSheet.getRange(i + 1, idxPass + 1).setValue(hashPassword_(password));
            SpreadsheetApp.flush();
            logAudit_(row[idxUser] || username, 'PASSWORD_HASH_UPGRADED', row[idxUser] || username, { source: 'Users' });
          }
          
          const nhomKiemTra = String(idxNhomKT !== -1 ? row[idxNhomKT] : '').trim();
          const quyenChuoi = String(idxQuyen !== -1 ? row[idxQuyen] : '').trim();
          const adminRoleKeys = ['admin', 'quan tri', 'quan tri vien', 'administrator'];
          const userRoleTokens = splitConfigList_(nhomKiemTra).concat(splitConfigList_(quyenChuoi));
          const isAdminUser = adminRoleKeys.includes(foldText_(nhomKiemTra))
            || adminRoleKeys.includes(foldText_(quyenChuoi))
            || userRoleTokens.some(token => adminRoleKeys.includes(foldText_(token)));
          let roles = isAdminUser ? ['Admin'] : parseUserRoles_(foldText_(nhomKiemTra) === 'khong' ? 'Khoa' : nhomKiemTra);
          if (!isAdminUser && quyenChuoi) {
            const roleTokens = splitConfigList_(quyenChuoi).map(foldText_);
            if (roleTokens.includes('khoa')) roles = uniqueValues_(roles.concat(['Khoa']));
            if (roleTokens.includes('doankt') || roleTokens.includes('doan kt') || roleTokens.includes('doan kiem tra')) roles = uniqueValues_(roles.concat(['DoanKT']));
            if (roleTokens.includes('truong nhom') || roleTokens.includes('truongnhom') || roleTokens.includes('nhom truong')) roles = uniqueValues_(roles.concat(['TruongNhom']));
            if (roleTokens.includes('thu ki') || roleTokens.includes('thu ky') || roleTokens.includes('thuki') || roleTokens.includes('thuky')) roles = uniqueValues_(roles.concat(['ThuKi']));
          }
          const defaultRole = roles[0];
          const roleOnlyTokens = ['khoa', 'doankt', 'doan kt', 'doan kiem tra', 'truong nhom', 'truongnhom', 'nhom truong', 'thu ki', 'thu ky', 'thuki', 'thuky'];
          const danhSachKhoa = isAdminUser ? ['All'] : (quyenChuoi ? quyenChuoi.split(",").map(k => k.trim()).filter(k => !roleOnlyTokens.includes(foldText_(k))) : []);
          const baseAssignments = danhSachKhoa.map(khoa => ({ khoa: khoa, phong: '' }));
          const settingsAssignments = getSettingsAssignmentsForUser_(ss, row[idxUser], row[idxName]);
          const mergedAssignments = isAdminUser ? [{ khoa: 'All', phong: 'All' }] : mergeAssignments_(baseAssignments, settingsAssignments);
          
          return {
            success: true,
            data: {
              username: row[idxUser],
              name: row[idxName],
              phong: idxPhong !== -1 ? row[idxPhong] : '', 
              role: defaultRole,
              activeRole: defaultRole,
              roles: roles,
              quyenTruyCap: danhSachKhoa,
              phanCong: mergedAssignments,
              phongDuocGiao: isAdminUser ? ['All'] : uniqueValues_(mergedAssignments.map(item => item.phong))
            }
          };
        } else {
          return { success: false, message: "Sai mật khẩu!" };
        }
      }
    }
    return { success: false, message: "Không tìm thấy tên đăng nhập!" };
    
  } catch (error) {
    return { success: false, message: "Lỗi Server: " + error.message };
  }
}
