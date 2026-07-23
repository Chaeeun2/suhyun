/**
 * Cloudflare Worker - suhyun-worker
 * R2 미디어 업로드/삭제 API + 테스트 페이지
 *
 * R2 binding: env.MEDIA_BUCKET  (버킷: suhyun-assets)
 *
 * 엔드포인트
 *  - GET    /                 : 업로드/삭제를 확인할 수 있는 테스트 페이지
 *  - POST   /upload           : 파일 업로드 (multipart/form-data, 필드명 "file")
 *                               성공 시 { url, objectKey, type, size } 반환
 *  - POST   /delete           : 파일 삭제 (JSON body: { "objectKey": "..." })
 *  - GET    /<objectKey>       : 업로드된 미디어를 R2에서 읽어 반환 (공개 도메인 미설정 시 사용)
 *
 * 보안
 *  - CORS: env.ALLOWED_ORIGIN 에 등록된 주소(또는 same-origin)만 허용
 *  - R2 Access Key / Secret Key 는 코드/브라우저에 포함하지 않음 (binding 사용)
 */

// 파일 형식(MIME) → 확장자 매핑 (안전한 확장자만 사용)
const EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const cors = resolveCors(request, env);

    // CORS preflight (브라우저가 POST 전에 보내는 OPTIONS 요청)
    if (request.method === "OPTIONS") {
      if (!cors.ok) return new Response("Origin not allowed", { status: 403 });
      return new Response(null, { status: 204, headers: cors.headers });
    }

    try {
      // 1) 테스트 페이지
      if (request.method === "GET" && pathname === "/") {
        return serveTestPage();
      }

      // 2) 업로드
      if (request.method === "POST" && pathname === "/upload") {
        if (!cors.ok) return json({ error: "Origin not allowed" }, 403, cors.headers);
        return await handleUpload(request, env, cors.headers);
      }

      // 3) 삭제 (objectKey 기반)
      if (request.method === "POST" && pathname === "/delete") {
        if (!cors.ok) return json({ error: "Origin not allowed" }, 403, cors.headers);
        return await handleDelete(request, env, cors.headers);
      }

      // 4) 미디어 서빙 (공개 도메인 미설정 시 Worker가 직접 제공)
      if (request.method === "GET") {
        return await serveObject(request, env);
      }

      return json({ error: "Not found" }, 404, cors.headers);
    } catch (err) {
      return json({ error: "Internal error", detail: String(err && err.message || err) }, 500, cors.headers);
    }
  },
};

/* ------------------------- 업로드 ------------------------- */
async function handleUpload(request, env, corsHeaders) {
  const allowedTypes = getAllowedTypes(env);
  const maxBytes = getMaxBytes(env);

  // 본문 크기 사전 검사 (Content-Length 헤더 기준으로 빠르게 차단)
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength && contentLength > maxBytes + 1024 * 1024) {
    return json({ error: "File too large", maxBytes }, 413, corsHeaders);
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return json({ error: "multipart/form-data 형식으로 'file' 필드를 보내주세요." }, 400, corsHeaders);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "'file' 필드가 필요합니다." }, 400, corsHeaders);
  }

  const type = file.type;
  // (1) 파일 형식 제한
  if (!allowedTypes.includes(type) || !EXT_BY_TYPE[type]) {
    return json(
      { error: `허용되지 않은 파일 형식입니다: ${type || "(unknown)"}`, allowed: allowedTypes },
      415,
      corsHeaders,
    );
  }
  // (1) 최대 용량 제한
  if (file.size > maxBytes) {
    return json({ error: "파일이 너무 큽니다.", maxBytes, size: file.size }, 413, corsHeaders);
  }
  if (file.size === 0) {
    return json({ error: "빈 파일은 업로드할 수 없습니다." }, 400, corsHeaders);
  }

  // (2) Worker에서 안전한 고유 파일명 생성 (사용자 입력 파일명은 사용하지 않음)
  const ext = EXT_BY_TYPE[type];
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const objectKey = `uploads/${yyyy}/${mm}/${crypto.randomUUID()}.${ext}`;

  // (3) R2에 저장 (MEDIA_BUCKET binding 사용)
  await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: type },
  });

  // (5) 성공 응답: url, objectKey, type, size
  const mediaUrl = buildPublicUrl(request, env, objectKey);
  return json({ url: mediaUrl, objectKey, type, size: file.size }, 200, corsHeaders);
}

/* ------------------------- 삭제 ------------------------- */
async function handleDelete(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  const objectKey = body && body.objectKey;

  // (4) 미디어 URL이 아니라 objectKey를 받아 처리
  if (!objectKey || typeof objectKey !== "string") {
    return json({ error: "objectKey(문자열)가 필요합니다." }, 400, corsHeaders);
  }
  // 안전장치: 비정상적인 key 차단
  if (objectKey.includes("..") || objectKey.startsWith("/")) {
    return json({ error: "유효하지 않은 objectKey 입니다." }, 400, corsHeaders);
  }

  await env.MEDIA_BUCKET.delete(objectKey);
  return json({ ok: true, deleted: objectKey }, 200, corsHeaders);
}

/* ------------------------- 미디어 서빙 ------------------------- */
async function serveObject(request, env) {
  const { pathname } = new URL(request.url);
  const key = decodeURIComponent(pathname.slice(1));
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA_BUCKET.get(key);
  if (object === null) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

/* ------------------------- 헬퍼 ------------------------- */
function getAllowedTypes(env) {
  const raw = String(env.ALLOWED_TYPES || "").trim();
  if (!raw) return Object.keys(EXT_BY_TYPE);
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function getMaxBytes(env) {
  const mb = Number(env.MAX_UPLOAD_MB || 25);
  return (Number.isFinite(mb) && mb > 0 ? mb : 25) * 1024 * 1024;
}

// 공개 URL 생성: PUBLIC_MEDIA_DOMAIN 이 있으면 그 도메인, 없으면 Worker 자신의 주소
function buildPublicUrl(request, env, objectKey) {
  const domain = String(env.PUBLIC_MEDIA_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  if (domain) return `https://${domain}/${objectKey}`;
  return `${new URL(request.url).origin}/${objectKey}`;
}

// CORS 판단: Origin 헤더가 없으면(curl/same-origin) 허용, 있으면 허용목록/same-origin만 허용
function resolveCors(request, env) {
  const origin = request.headers.get("Origin");
  const host = new URL(request.url).host;
  // 끝 슬래시(/)는 자동으로 무시해서 비교 (설정 실수 방지)
  const allowList = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  // Origin 헤더가 없는 요청 (curl, 서버-서버, 동일 출처 내비게이션)
  if (!origin) return { ok: true, headers: {} };

  const normOrigin = origin.replace(/\/+$/, "");
  let allowOrigin = null;
  try {
    const o = new URL(origin);
    if (o.host === host) {
      allowOrigin = origin; // same-origin
    } else if (o.hostname === "localhost" || o.hostname === "127.0.0.1") {
      // 로컬 개발 편의: localhost / 127.0.0.1 은 포트와 상관없이 자동 허용
      allowOrigin = origin;
    }
  } catch {
    /* invalid origin */
  }
  if (!allowOrigin && allowList.includes(normOrigin)) allowOrigin = origin;

  if (!allowOrigin) return { ok: false, headers: {} };

  return {
    ok: true,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

// 테스트 페이지 서빙 (worker/test/index.html 을 문자열로 import)
import testPageHtml from "../test/index.html";
function serveTestPage() {
  return new Response(testPageHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
