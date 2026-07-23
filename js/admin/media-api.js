import {
  MEDIA_API_URL,
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_TYPES,
} from "./media-config.js";

/**
 * Worker API 오류를 사용자용 메시지로 변환
 */
export function getMediaErrorMessage(error) {
  if (error && error.message === "FILE_TOO_LARGE") {
    return "파일 크기는 1MB 이하여야 합니다.";
  }
  if (error && error.message === "FILE_TYPE_NOT_ALLOWED") {
    return "허용되지 않은 파일 형식입니다. WebP, JPG, PNG, GIF, MP4만 업로드할 수 있습니다.";
  }
  if (error && error.message === "ORIGIN_NOT_ALLOWED") {
    return "업로드가 허용되지 않은 환경입니다. 관리자에게 문의해 주세요.";
  }
  if (error && error.message === "DELETE_FAILED") {
    return "미디어 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "미디어 업로드에 실패했습니다. 다시 시도해 주세요.";
}

export function validateMediaFile(file) {
  if (!file) {
    const err = new Error("No file");
    err.message = "FILE_REQUIRED";
    throw err;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const err = new Error("Too large");
    err.message = "FILE_TOO_LARGE";
    throw err;
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    const err = new Error("Bad type");
    err.message = "FILE_TYPE_NOT_ALLOWED";
    throw err;
  }
}

/**
 * R2 업로드
 * @returns {{ url, objectKey, type, size }}
 */
export async function uploadMedia(file) {
  validateMediaFile(file);

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(MEDIA_API_URL + "/upload", {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 403) {
      const err = new Error("Origin not allowed");
      err.message = "ORIGIN_NOT_ALLOWED";
      throw err;
    }
    if (res.status === 413) {
      const err = new Error("Too large");
      err.message = "FILE_TOO_LARGE";
      throw err;
    }
    const err = new Error("Upload failed");
    err.message = "UPLOAD_FAILED";
    throw err;
  }

  return {
    url: data.url,
    objectKey: data.objectKey,
    type: data.type,
    size: data.size,
  };
}

/**
 * R2 삭제 (이미 삭제된 objectKey 는 오류로 처리하지 않음)
 */
export async function deleteMedia(objectKey) {
  if (!objectKey) return { ok: true, skipped: true };

  const res = await fetch(MEDIA_API_URL + "/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectKey }),
  });

  if (res.ok) return { ok: true };

  if (res.status === 404) {
    return { ok: true, notFound: true };
  }

  const err = new Error("Delete failed");
  err.message = "DELETE_FAILED";
  throw err;
}

function uniqueKeys(objectKeys) {
  return [...new Set((objectKeys || []).filter(Boolean))];
}

/**
 * 여러 objectKey 삭제 (중복 키·이미 삭제된 키는 오류 없이 처리)
 */
export async function deleteMediaMany(objectKeys) {
  const report = await deleteMediaManyWithReport(objectKeys);
  if (report.failed.length) {
    const err = new Error("Delete failed");
    err.message = "DELETE_FAILED";
    err.failedKeys = report.failed;
    throw err;
  }
  return report;
}

/**
 * 삭제 결과 보고 (실패한 objectKey 목록 반환)
 */
export async function deleteMediaManyWithReport(objectKeys) {
  const keys = uniqueKeys(objectKeys);
  const deleted = [];
  const failed = [];

  for (const key of keys) {
    try {
      await deleteMedia(key);
      deleted.push(key);
    } catch {
      failed.push(key);
    }
  }

  return { deleted, failed };
}
