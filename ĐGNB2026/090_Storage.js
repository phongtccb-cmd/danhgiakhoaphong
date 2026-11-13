/**
 * 090_Storage.js
 * Google Drive folders, uploads, and authorization.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function getOrCreateFolder_(parent, name) {
  if (!parent) {
    throw new Error("Tham số 'parent' chưa được cung cấp. Có thể bạn đang chạy hàm phụ này trực tiếp trong Editor. Vui lòng chọn chạy hàm 'testDriveAuthorization' để kiểm tra kết nối.");
  }
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  const newFolder = parent.createFolder(name);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function sanitizeDriveFileName_(value) {
  const cleaned = String(value || '').trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'Minh_chung').slice(0, 180);
}

const EVIDENCE_UPLOAD_MAX_BYTES_ = 15 * 1024 * 1024;
const EVIDENCE_ALLOWED_EXTENSIONS_ = {
  pdf: true,
  png: true,
  jpg: true,
  jpeg: true,
  gif: true,
  webp: true,
  doc: true,
  docx: true,
  xls: true,
  xlsx: true
};
const EVIDENCE_BLOCKED_EXTENSIONS_ = {
  exe: true,
  dll: true,
  msi: true,
  com: true,
  scr: true,
  bat: true,
  cmd: true,
  ps1: true,
  sh: true,
  js: true,
  jse: true,
  vbs: true,
  vbe: true,
  wsf: true,
  html: true,
  htm: true,
  svg: true,
  jar: true,
  apk: true,
  app: true,
  dmg: true,
  docm: true,
  xlsm: true,
  pptm: true,
  zip: true,
  rar: true,
  '7z': true
};
const EVIDENCE_ALLOWED_MIME_TYPES_ = {
  'application/pdf': true,
  'image/png': true,
  'image/jpeg': true,
  'image/gif': true,
  'image/webp': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true
};
const EVIDENCE_FALLBACK_MIME_TYPES_ = {
  '': true,
  'application/octet-stream': true
};

function getUploadFileExtension_(fileName) {
  const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function getUploadBase64Payload_(base64Data) {
  const raw = String(base64Data || '');
  return (raw.indexOf(',') >= 0 ? raw.split(',').pop() : raw).replace(/\s+/g, '');
}

function estimateBase64DecodedBytes_(base64Clean) {
  if (!base64Clean) return 0;
  const padding = (base64Clean.match(/=+$/) || [''])[0].length;
  return Math.floor(base64Clean.length * 3 / 4) - padding;
}

function validateEvidenceUpload_(base64Data, fileName, mimeType) {
  const extension = getUploadFileExtension_(fileName);
  const normalizedMimeType = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (!extension) {
    return { success: false, message: 'Tệp minh chứng cần có phần mở rộng hợp lệ.' };
  }
  if (EVIDENCE_BLOCKED_EXTENSIONS_[extension]) {
    return { success: false, message: 'Loại tệp này không được phép tải lên vì có rủi ro mã độc.' };
  }
  if (!EVIDENCE_ALLOWED_EXTENSIONS_[extension]) {
    return { success: false, message: 'Chỉ cho phép tải lên ảnh, PDF, Word hoặc Excel.' };
  }
  if (!EVIDENCE_ALLOWED_MIME_TYPES_[normalizedMimeType] && !EVIDENCE_FALLBACK_MIME_TYPES_[normalizedMimeType]) {
    return { success: false, message: 'Định dạng tệp không nằm trong danh sách được phép.' };
  }

  const base64Clean = getUploadBase64Payload_(base64Data);
  if (!base64Clean || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Clean)) {
    return { success: false, message: 'Dữ liệu tệp tải lên không hợp lệ.' };
  }
  if (estimateBase64DecodedBytes_(base64Clean) > EVIDENCE_UPLOAD_MAX_BYTES_) {
    return { success: false, message: 'Dung lượng tệp tối đa cho phép là 15MB.' };
  }
  return { success: true, base64Clean: base64Clean, mimeType: normalizedMimeType || mimeType || 'application/octet-stream' };
}

/**
 * API Upload file Base64 trực tiếp lên Google Drive của Admin hệ thống
 */

function uploadFileToDrive(base64Data, fileName, mimeType, khoa, maTC, sessionToken) {
  try {
    const auth = requireSession_(sessionToken);
    if (!auth.success) return auth;

    const access = requireKhoaAccess_(auth.user, khoa);
    if (!access.success) return access;

    const rootName = "[83TC] Kho_Minh_Chung_Benh_Vien";
    const driveRoot = DriveApp.getRootFolder();
    const safeFileName = sanitizeDriveFileName_(fileName);
    const uploadValidation = validateEvidenceUpload_(base64Data, safeFileName, mimeType);
    if (!uploadValidation.success) return uploadValidation;
    
    // Tự động dựng cây thư mục
    const rootFolder = getOrCreateFolder_(driveRoot, rootName);
    const khoaFolder = getOrCreateFolder_(rootFolder, khoa);
    const tcFolder = getOrCreateFolder_(khoaFolder, maTC);
    
    // Convert Base64 sang Blob tệp tin
    const decoded = Utilities.base64Decode(uploadValidation.base64Clean);
    if (decoded.length > EVIDENCE_UPLOAD_MAX_BYTES_) {
      return { success: false, message: 'Dung lượng tệp tối đa cho phép là 15MB.' };
    }
    const blob = Utilities.newBlob(decoded, uploadValidation.mimeType, safeFileName);
    
    // Lưu file vào thư mục tiêu chí cụ thể
    const file = tcFolder.createFile(blob);
    
    // ÉP QUYỀN TRUY CẬP: Bất kỳ ai có link đều xem được (Rất quan trọng cho Đoàn KT)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    logAudit_(auth.user, 'UPLOAD_EVIDENCE', String(khoa || '') + ' / ' + String(maTC || ''), {
      fileName: safeFileName,
      mimeType: uploadValidation.mimeType,
      url: file.getUrl()
    });
    
    return {
      success: true,
      url: file.getUrl(),
      fileName: safeFileName
    };
  } catch (e) {
    return { success: false, message: "Lỗi Drive Server: " + e.message };
  }
}

function uploadLab2429EvidenceToDrive(base64Data, fileName, mimeType, deptName, rowCode, sessionToken) {
  try {
    const auth = requireLab2429Access_(sessionToken, deptName, true);
    if (!auth.success) return auth;

    const dept = getLab2429DepartmentByName_(deptName);
    if (!dept) return { success: false, message: 'Không tìm thấy khoa xét nghiệm.' };

    const safeFileName = sanitizeDriveFileName_(fileName);
    const uploadValidation = validateEvidenceUpload_(base64Data, safeFileName, mimeType);
    if (!uploadValidation.success) return uploadValidation;

    const rootName = "[83TC] Kho_Minh_Chung_Benh_Vien";
    const driveRoot = DriveApp.getRootFolder();
    const rootFolder = getOrCreateFolder_(driveRoot, rootName);
    const khoaFolder = getOrCreateFolder_(rootFolder, dept.name);
    const itemFolder = getOrCreateFolder_(khoaFolder, '2429_' + sanitizeDriveFileName_(rowCode || 'Chung'));

    const decoded = Utilities.base64Decode(uploadValidation.base64Clean);
    if (decoded.length > EVIDENCE_UPLOAD_MAX_BYTES_) {
      return { success: false, message: 'Dung lượng tệp tối đa cho phép là 15MB.' };
    }
    const blob = Utilities.newBlob(decoded, uploadValidation.mimeType, safeFileName);
    const file = itemFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    logAudit_(auth.user, 'UPLOAD_LAB2429_EVIDENCE', dept.name + ' / ' + String(rowCode || ''), {
      fileName: safeFileName,
      mimeType: uploadValidation.mimeType,
      url: file.getUrl()
    });

    return {
      success: true,
      url: file.getUrl(),
      fileName: safeFileName
    };
  } catch (e) {
    return { success: false, message: "Lỗi Drive Server: " + e.message };
  }
}

// ==========================================
// 5. HÀM KÍCH HOẠT QUYỀN TRUY CẬP DRIVE (OAUTH SIGN-IN TRÒN TRỊA)
// ==========================================

function testDriveAuthorization_() {
  try {
    const rootFolder = DriveApp.getRootFolder();
    Logger.log("Kết nối Drive thành công! Thư mục gốc của bạn là: " + rootFolder.getName());
    
    const rootName = "[83TC] Kho_Minh_Chung_Benh_Vien";
    const folder = getOrCreateFolder_(rootFolder, rootName);
    Logger.log("Thư mục hệ thống: " + folder.getName() + " - Link chia sẻ: " + folder.getUrl());
  } catch (e) {
    Logger.log("Lỗi kết nối Drive: " + e.message);
  }
}
