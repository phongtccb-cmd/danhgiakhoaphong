/**
 * 040_Audit.js
 * Audit trail and API performance logging.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function getAuditSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_SHEET_NAME);
    sheet.appendRow(AUDIT_HEADERS);
    sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).setFontWeight('bold').setBackground('#fee2e2');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, AUDIT_HEADERS.length);
  }
  return sheet;
}

function getAuditActor_(actor) {
  if (actor && typeof actor === 'object') {
    return {
      actor: String(actor.username || actor.name || 'unknown').trim(),
      role: String(actor.role || '').trim()
    };
  }
  return {
    actor: String(actor || 'anonymous').trim(),
    role: ''
  };
}

function trimAuditValue_(value, maxLength) {
  const text = String(value === null || value === undefined ? '' : value);
  const limit = maxLength || 500;
  return text.length > limit ? text.slice(0, limit) + '...' : text;
}

function safeAuditDetails_(details) {
  const source = details && typeof details === 'object' ? details : {};
  const blockedKeys = ['password', 'sessionToken', 'token', 'base64Data'];
  const result = {};

  Object.keys(source).forEach(key => {
    if (blockedKeys.includes(key)) return;
    const value = source[key];
    if (value === null || value === undefined) {
      result[key] = '';
    } else if (typeof value === 'object') {
      result[key] = trimAuditValue_(JSON.stringify(value), 1200);
    } else {
      result[key] = trimAuditValue_(value, 1200);
    }
  });

  return result;
}

function logAudit_(actor, action, target, details) {
  try {
    const who = getAuditActor_(actor);
    const sheet = getAuditSheet_();
    sheet.appendRow([
      new Date(),
      who.actor,
      who.role,
      String(action || '').trim(),
      trimAuditValue_(target, 500),
      JSON.stringify(safeAuditDetails_(details || {}))
    ]);
  } catch (e) {
    // Audit must never break the user workflow.
  }
}

function logApiPerformance_(actor, apiName, target, startMs, details, thresholdMs) {
  try {
    const elapsedMs = Date.now() - Number(startMs || Date.now());
    const source = details && typeof details === 'object' ? details : {};
    const isError = !!source.error;
    const threshold = Number(thresholdMs || PERF_LOG_DEFAULT_THRESHOLD_MS);
    if (!isError && elapsedMs < threshold) return;

    logAudit_(actor || 'system', isError ? 'API_PERF_ERROR' : 'API_PERF_SLOW', apiName + (target ? ' / ' + target : ''), Object.assign({}, source, {
      api: apiName,
      target: target || '',
      elapsedMs: elapsedMs,
      thresholdMs: threshold
    }));
  } catch (e) {
    // Performance logging must never break the user workflow.
  }
}

function parseAuditDetails_(value) {
  const text = String(value || '').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text };
  }
}

function getAuditLog(sessionToken, limit) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [] };
    }

    const maxRows = Math.min(Math.max(Number(limit) || 300, 1), 1000);
    const totalRows = sheet.getLastRow() - 1;
    const count = Math.min(maxRows, totalRows);
    const startRow = sheet.getLastRow() - count + 1;
    const values = sheet.getRange(startRow, 1, count, AUDIT_HEADERS.length).getValues();
    const rows = values.map((row, index) => {
      const rowNumber = startRow + index;
      const details = parseAuditDetails_(row[5]);
      return {
        rowNumber: rowNumber,
        time: formatDateTimeForClient_(row[0]),
        timeMs: row[0] instanceof Date ? row[0].getTime() : 0,
        actor: String(row[1] || ''),
        role: String(row[2] || ''),
        action: String(row[3] || ''),
        target: String(row[4] || ''),
        details: details,
        detailsText: JSON.stringify(details)
      };
    }).reverse();

    return { success: true, data: rows };
  } catch (e) {
    return { success: false, message: 'Lỗi tải nhật ký audit: ' + e.message };
  }
}

function buildApiPerformanceStats_(limit) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return {
      scannedRows: 0,
      totalSlow: 0,
      totalError: 0,
      slowest: [],
      byApi: []
    };
  }

  const maxRows = Math.min(Math.max(Number(limit) || 1000, 1), 3000);
  const totalRows = sheet.getLastRow() - 1;
  const count = Math.min(maxRows, totalRows);
  const startRow = sheet.getLastRow() - count + 1;
  const values = sheet.getRange(startRow, 1, count, AUDIT_HEADERS.length).getValues();
  const byApi = {};
  const slowest = [];
  let totalSlow = 0;
  let totalError = 0;

  values.forEach(row => {
    const action = String(row[3] || '').trim();
    if (action !== 'API_PERF_SLOW' && action !== 'API_PERF_ERROR') return;

    const details = parseAuditDetails_(row[5]);
    const api = String(details.api || row[4] || 'unknown').split(' / ')[0].trim() || 'unknown';
    const elapsedMs = Number(details.elapsedMs || 0);
    const entry = byApi[api] || {
      api: api,
      count: 0,
      errors: 0,
      totalMs: 0,
      maxMs: 0,
      avgMs: 0,
      lastAt: '',
      lastAtMs: 0
    };

    entry.count += 1;
    entry.totalMs += elapsedMs;
    entry.maxMs = Math.max(entry.maxMs, elapsedMs);
    if (action === 'API_PERF_ERROR') entry.errors += 1;
    const timeMs = row[0] instanceof Date ? row[0].getTime() : 0;
    if (timeMs >= entry.lastAtMs) {
      entry.lastAtMs = timeMs;
      entry.lastAt = formatDateTimeForClient_(row[0]);
    }
    byApi[api] = entry;

    if (action === 'API_PERF_ERROR') totalError += 1;
    else totalSlow += 1;

    slowest.push({
      api: api,
      action: action,
      target: String(details.target || row[4] || '').trim(),
      elapsedMs: elapsedMs,
      thresholdMs: Number(details.thresholdMs || 0),
      time: formatDateTimeForClient_(row[0])
    });
  });

  const byApiRows = Object.keys(byApi).map(key => {
    const item = byApi[key];
    item.avgMs = item.count ? Math.round(item.totalMs / item.count) : 0;
    return item;
  }).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.maxMs - a.maxMs;
  });

  slowest.sort((a, b) => b.elapsedMs - a.elapsedMs);

  return {
    scannedRows: count,
    totalSlow: totalSlow,
    totalError: totalError,
    byApi: byApiRows.slice(0, 8),
    slowest: slowest.slice(0, 8)
  };
}

function getApiPerformanceStats(sessionToken, limit) {
  try {
    const auth = requireAdmin_(sessionToken);
    if (!auth.success) return auth;
    return { success: true, data: buildApiPerformanceStats_(limit) };
  } catch (e) {
    return { success: false, message: 'Lỗi thống kê API chậm: ' + e.message };
  }
}
