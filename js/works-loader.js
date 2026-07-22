/* ============================================================
   works 데이터 로더
   - data/works.js 의 WORKS_RAW 를 불러온 뒤 slug 를 자동 생성
   - slug 는 제목(영문 우선 → 국문)으로 만들고, 한글만이면 work-01 형식
   ============================================================ */

function makeSlug(work, index) {
  var title = work.title || {};
  var source = (title.en || title.ko || "").trim();

  var slug = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  if (!slug || slug.length < 2 || /^[0-9-]+$/.test(slug)) {
    slug = "work-" + String(index + 1).padStart(2, "0");
  }

  return slug;
}

function prepareWorks(raw) {
  var used = {};
  return (raw || []).map(function (work, index) {
    var slug = makeSlug(work, index);
    var suffix = 2;

    while (used[slug]) {
      slug = makeSlug(work, index) + "-" + suffix;
      suffix += 1;
    }
    used[slug] = true;

    return Object.assign({}, work, { slug: slug });
  });
}

function loadWorksData(basePath) {
  basePath = basePath || "";

  if (window.WORKS_RAW) {
    return Promise.resolve(prepareWorks(window.WORKS_RAW));
  }

  return new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    script.src = basePath + "data/works.js";
    script.onload = function () {
      resolve(prepareWorks(window.WORKS_RAW || []));
    };
    script.onerror = function () {
      reject(new Error("works.js load failed"));
    };
    document.head.appendChild(script);
  });
}
