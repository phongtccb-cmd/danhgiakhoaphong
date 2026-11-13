/**
 * 099_WebApp.js
 * Web app router, HTML includes, and HTTP entry points.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function doGet(e) {
  return renderWebAppHtml_('200_Index', 'Phần mềm Đánh giá 83 Tiêu chí');
}

function renderWebAppHtml_(filename, title) {
  const content = HtmlService.createTemplateFromFile(filename).evaluate().getContent();
  return HtmlService.createHtmlOutput(content)
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function parsePostJson_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function requireStressTestKey_(payload) {
  const configuredKey = String(PropertiesService.getScriptProperties().getProperty(STRESS_TEST_KEY_PROPERTY) || '').trim();
  if (!configuredKey) {
    return failResponse_('Stress test endpoint chưa được bật. Hãy cấu hình Script Property STRESS_TEST_KEY trước khi chạy k6.', { code: 'STRESS_DISABLED' });
  }

  const providedKey = String(payload && payload.stressKey || '').trim();
  if (!providedKey || providedKey !== configuredKey) {
    return failResponse_('Stress test key không hợp lệ.', { code: 'STRESS_FORBIDDEN' });
  }

  return { success: true };
}

function stressWriteEnabled_() {
  return String(PropertiesService.getScriptProperties().getProperty(STRESS_ALLOW_WRITE_PROPERTY) || '').trim().toLowerCase() === 'true';
}

function doPost(e) {
  const payload = parsePostJson_(e);
  if (!payload) {
    return jsonResponse_(failResponse_('Payload JSON không hợp lệ.', { code: 'BAD_JSON' }));
  }

  const keyCheck = requireStressTestKey_(payload);
  if (!keyCheck.success) return jsonResponse_(keyCheck);

  try {
    const action = String(payload.action || '').trim();
    const data = payload.data || {};
    let result;

    switch (action) {
      case 'ping':
        result = { success: true, data: { now: new Date().toISOString() } };
        break;
      case 'login':
        result = loginUser(data.username, data.password);
        break;
      case 'selectRole':
        result = selectLoginRole(data.pendingLoginToken, data.role);
        break;
      case 'currentUser':
        result = getCurrentSessionUser(data.sessionToken);
        break;
      case 'khoa':
        result = getDanhSachKhoaTuDepartment(data.sessionToken);
        break;
      case 'phong':
        result = getDanhSachPhongPhuTrach(data.sessionToken, data.khoa);
        break;
      case 'checklist':
        result = getChecklistMasterData(data.khoa, data.phong || 'All', data.sessionToken);
        break;
      case 'evidence':
        result = getEvidenceManagementData(data.khoa, data.phong || 'All', data.sessionToken);
        break;
      case 'updateEvidence':
        result = updateEvidenceItem(data.id_ketqua, data.magop, data.itemId, data.payload || {}, data.sessionToken);
        break;
      case 'detail':
        result = getChiTietPhieuDaLoc(data.id_ketqua, data.phong || 'All', data.magop, data.sessionToken);
        break;
      case 'summary':
        result = getBangTongHopDanhGia(data.khoaList || [], data.sessionToken);
        break;
      case 'dashboard':
        result = getDashboardOverview(data.khoaList || [], data.sessionToken);
        break;
      case 'saveScore':
        if (!stressWriteEnabled_() || data.allowWrite !== true) {
          result = failResponse_('Stress test ghi dữ liệu đang tắt. Đặt STRESS_ALLOW_WRITE=true và truyền allowWrite=true nếu thật sự muốn test lưu điểm.', { code: 'STRESS_WRITE_DISABLED' });
          break;
        }
        result = saveKetQuaSmartMerge(data.id_ketqua, data.items || [], data.trangThai || '', data.magop, data.sessionToken);
        break;
      default:
        result = failResponse_('Action stress test không được hỗ trợ: ' + action, { code: 'UNKNOWN_ACTION' });
    }

    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_(failResponse_('Stress endpoint lỗi: ' + err.message, { code: 'STRESS_ENDPOINT_ERROR' }));
  }
}

function include(filename) {
  try {
    const allowedIncludes = [
      '100_Tailwind',
      '101_SweetAlert',
      '102_Fonts',
      '110_UI_Runtime',
      '120_UI_Router',
      '211_Controller_Login',
      '300_DashboardView',
      '301_Controller_Dashboard',
      '310_ChecklistView',
      '311_Controller_Checklist',
      '320_EvidenceView',
      '321_Controller_Evidence',
      '330_ResultView',
      '331_Controller_Result',
      '340_Lab2429View',
      '341_Controller_Lab2429',
      '342_BiosafetyView',
      '343_Controller_Biosafety',
      '350_AdminView',
      '351_Controller_Admin',
      '360_AccountView',
      '361_Controller_Account'
    ];
    if (!allowedIncludes.includes(String(filename || ''))) {
      return '<!-- Include not allowed -->';
    }
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    return `<!-- Lỗi tải file: ${filename} -->`;
  }
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}
