/**
 * Cloudflare Worker 미디어 API 설정
 */
export const MEDIA_API_URL = "https://suhyun-worker.winter-sun-8ec7.workers.dev";

/** Figma admin-modal 기준 업로드 제한 */
export const MAX_UPLOAD_BYTES = 1 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
];

export const UPLOAD_HINT =
  "제한 용량: 1MB / 허용 확장자 : WebP, JPG, PNG, GIF, MP4";
