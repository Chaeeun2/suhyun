/**
 * Firestore 문서 → 프론트엔드 work 객체
 * slug 필드는 없으며, 문서 ID가 slug 역할을 합니다.
 */
export function mapWorkDoc(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    slug: docSnap.id,
    category: data.category || "",
    date: data.date || "",
    order: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    title: data.title || { ko: "", en: "" },
    caption: data.caption || { ko: "", en: "" },
    description: data.description || { ko: "", en: "" },
    thumbnail: data.thumbnail || null,
    detailImages: Array.isArray(data.detailImages) ? data.detailImages : [],
    video: data.video || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export function sortWorks(works) {
  return works.slice().sort(function (a, b) {
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff !== 0) return orderDiff;

    const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * 제목에서 Firestore 문서 ID 생성 (slug 필드 대신 문서 ID로 사용)
 */
export function makeWorkId(title, fallbackIndex) {
  const source = ((title && (title.en || title.ko)) || "").trim();

  let id = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  if (!id || id.length < 2 || /^[0-9-]+$/.test(id)) {
    id = "work-" + String((fallbackIndex || 0) + 1).padStart(2, "0");
  }

  return id;
}

export function sanitizeWorkInput(data) {
  return {
    category: data.category || "",
    date: data.date || "",
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    title: data.title || { ko: "", en: "" },
    caption: data.caption || { ko: "", en: "" },
    description: data.description || { ko: "", en: "" },
    thumbnail: data.thumbnail || null,
    detailImages: Array.isArray(data.detailImages) ? data.detailImages : [],
    video: data.video || null,
  };
}

/** R2 삭제용 objectKey 수집 */
export function collectMediaKeys(work) {
  const keys = [];

  if (work && work.thumbnail && work.thumbnail.objectKey) {
    keys.push(work.thumbnail.objectKey);
  }

  (work && work.detailImages ? work.detailImages : []).forEach(function (item) {
    if (item && item.objectKey) keys.push(item.objectKey);
  });

  if (work && work.video && work.video.objectKey) {
    keys.push(work.video.objectKey);
  }

  return keys;
}

export function parseWorkDate(dateStr) {
  const parts = (dateStr || "").split("/");
  const y = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return y * 100 + m;
}
