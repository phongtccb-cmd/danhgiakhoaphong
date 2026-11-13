/**
 * 000_Core.js
 * Constants, responses, and shared helpers.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

/**
 * HỆ THỐNG ĐÁNH GIÁ 83 TIÊU CHÍ CHẤT LƯỢNG BỆNH VIỆN
 * Chạy trên nền tảng Google Apps Script
 * Cơ sở dữ liệu cải tiến: Tách biệt điểm số (Cột C - Dữ liệu JSON) và minh chứng (Cột H - MC_JSON)
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_NAME = 'Data_JSON';
const CONFIG_SHEET_NAME = 'Config_83TC';
const AUDIT_SHEET_NAME = 'Audit_Log';
const SETTINGS_SHEET_CANDIDATES = ['Settings', 'Setting', 'Cau hinh', 'Cấu hình', '[v2.0] - Webapp __ ezCheck83TC - Kiểm tra Nội bộ - Settings'];
const CONFIG_HEADERS = ['Loai', 'Ma', 'Ten_hien_thi', 'Gia_tri_1', 'Gia_tri_2', 'Danh_sach', 'Thu_tu', 'Active', 'Ghi_chu'];
const AUDIT_HEADERS = ['Thoi_gian', 'Actor', 'Role', 'Action', 'Target', 'Details_JSON'];
const APP_CACHE_PREFIX = 'EZ83TC_V3';
const APP_CACHE_MAX_CHARS = 90000;
const APP_CACHE_CHUNK_CHARS = 70000;
const APP_CACHE_MAX_TOTAL_CHARS = 850000;
const CACHE_TTL_SHORT_SECONDS = 60;
const CACHE_TTL_CONFIG_SECONDS = 300;
const CACHE_TTL_DATA_SECONDS = 30;
const CACHE_TTL_ROW_INDEX_SECONDS = 300;
const CACHE_TTL_DASHBOARD_SECONDS = 300;
const PERF_LOG_DEFAULT_THRESHOLD_MS = 3500;
const PERF_LOG_SAVE_THRESHOLD_MS = 2500;
const STRESS_TEST_KEY_PROPERTY = 'STRESS_TEST_KEY';
const STRESS_ALLOW_WRITE_PROPERTY = 'STRESS_ALLOW_WRITE';
const CACHE_SCOPE_CONFIG = 'config';
const CACHE_SCOPE_SETTINGS = 'settings';
const CACHE_SCOPE_DEPARTMENT = 'department';
const CACHE_SCOPE_DATA = 'data';
const CACHE_SCOPE_DASHBOARD = 'dashboard';
const CACHE_SCOPE_ROW_INDEX = 'rowIndex';
const DEFAULT_PHONG_OPTIONS = [
  { value: 'CĐT & ĐT', label: 'Phòng Đào tạo Chỉ đạo tuyến (ĐTCĐT)' },
  { value: 'VTTBYT', label: 'Phòng Vật tư thiết bị y tế (VTTBYT)' },
  { value: 'KHTH', label: 'Phòng Kế hoạch tổng hợp (KHTH)' },
  { value: 'HCQT', label: 'Phòng Hành chính quản trị (HCQT)' },
  { value: 'QLCL', label: 'Phòng Quản lý chất lượng (QLCL)' },
  { value: 'TCCB', label: 'Phòng Tổ chức cán bộ (TCCB)' },
  { value: 'TCKT', label: 'Phòng Tài chính kế toán (TCKT)' },
  { value: 'CTXH', label: 'Phòng Công tác xã hội (CTXH)' },
  { value: 'ĐD', label: 'Phòng Điều dưỡng (ĐD)' },
  { value: 'CNTT', label: 'Phòng Công nghệ thông tin (CNTT)' },
  { value: 'KSNK', label: 'Khoa Kiểm soát nhiễm khuẩn (KSNK)' },
  { value: 'K.DINH DƯỠNG', label: 'Khoa Dinh dưỡng (K.DINH DƯỠNG)' },
  { value: 'Đơn vị CMD', label: 'Khoa Dược (Đơn vị CMD)' }
];

// Shared response and text helpers

function foldText_(value) {
  const safeValue = value === null || value === undefined ? '' : value;
  return String(safeValue)
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/đ/g, 'd');
}

function okResponse_(data, extra) {
  return Object.assign({ success: true, data: data }, extra || {});
}

function failResponse_(message, extra) {
  return Object.assign({ success: false, message: message || 'Không thực hiện được yêu cầu.' }, extra || {});
}

function sameText_(a, b) {
  return foldText_(a) === foldText_(b);
}

function splitConfigList_(value) {
  return String(value || '')
    .split(/[,\uFF0C;\n\r|]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function uniqueValues_(values) {
  const seen = {};
  const result = [];
  values.forEach(value => {
    const text = String(value || '').trim();
    const key = foldText_(text);
    if (text && !seen[key]) {
      seen[key] = true;
      result.push(text);
    }
  });
  return result;
}

function findHeaderIndex_(headers, aliases) {
  const normalizedHeaders = headers.map(header => foldText_(header));
  for (let i = 0; i < aliases.length; i++) {
    const target = foldText_(aliases[i]);
    const idx = normalizedHeaders.indexOf(target);
    if (idx !== -1) return idx;
  }
  return -1;
}

function getCellByHeader_(row, idx) {
  return idx === -1 ? '' : String(row[idx] || '').trim();
}

function getLeadingUnitPrefix_(value) {
  const text = String(value || '').trim();
  let prefix = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (char >= '0' && char <= '9') break;
    if (char === '-' || char === '_' || char === '.' || char === ' ') break;
    prefix += char;
  }
  return prefix.trim();
}

function mergeDepartmentUnits_(lists) {
  const seen = {};
  const merged = [];

  (lists || []).forEach(list => {
    (list || []).forEach(item => {
      const name = String(item && item.name || '').trim();
      const code = String(item && item.code || name || '').trim();
      if (!name || !code) return;

      const key = foldText_(name + '|' + code);
      if (!seen[key]) {
        seen[key] = true;
        merged.push({ name: name, code: code });
      }
    });
  });

  return merged;
}

function foldedStartsWith_(value, prefix) {
  const foldedValue = foldText_(value);
  const foldedPrefix = foldText_(prefix);
  return foldedPrefix && foldedValue.indexOf(foldedPrefix) === 0;
}

function formatDateTimeForClient_(value) {
  if (!value) return '';
  try {
    const dateValue = value instanceof Date ? value : new Date(value);
    if (isNaN(dateValue.getTime())) return String(value || '');
    return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return String(value || '');
  }
}

function getUniquePropertyForServer_(items, propName) {
  if (!items || !Array.isArray(items)) return '';
  const seen = {};
  const result = [];
  items.forEach(item => {
    const text = String(item[propName] || '').trim();
    const key = foldText_(text);
    if (text && !seen[key]) {
      seen[key] = true;
      result.push(text);
    }
  });
  return result.join(', ');
}
