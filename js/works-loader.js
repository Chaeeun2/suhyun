/* ============================================================
   works 데이터 로더 (Firestore)
   - works 컬렉션 조회 → order 내림차순 정렬
   - 문서 ID = slug
   - 미디어: R2 { url, objectKey, type, size } → url 사용
   ============================================================ */

var _preloadedThumbUrls = {};

/**
 * 미디어 URL 반환
 * - R2 객체: { url, ... }
 * - 레거시 문자열(백업 참고용): basePath 접두
 */
function workMediaUrl(media, basePath) {
  basePath = basePath || "";

  if (!media) return "";

  if (typeof media === "string") {
    if (/^https?:\/\//i.test(media)) return media;
    return basePath + media;
  }

  return media.url || "";
}

/**
 * 썸네일 preload (중복 요청 방지)
 */
function preloadWorkThumbnails(works, basePath) {
  (works || []).forEach(function (work) {
    var url = workMediaUrl(work.thumbnail, basePath);
    if (!url || _preloadedThumbUrls[url]) return;

    _preloadedThumbUrls[url] = true;

    var link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Firestore works 목록 로드
 * @returns {Promise<{ works: Array, status: 'ok'|'empty'|'error' }>}
 */
function loadWorksData(basePath) {
  basePath = basePath || "";

  return import(basePath + "js/firebase/works-store.js")
    .then(function (mod) {
      return mod.fetchWorksList().then(function (works) {
        var list = Array.isArray(works) ? works : [];
        preloadWorkThumbnails(list, basePath);
        return {
          works: list,
          status: list.length ? "ok" : "empty",
        };
      });
    })
    .catch(function (err) {
      console.error("Firestore works load error:", err);
      return {
        works: [],
        status: "error",
      };
    });
}
