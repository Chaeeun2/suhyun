/* ============================================================
   작품 상세 페이지 (work/view/#slug)
   - Firestore works → 문서 ID(slug)로 작품 조회·렌더
   ============================================================ */

const titleEl = document.getElementById("workTitle");
const metaEl = document.getElementById("workMeta");
const descEl = document.getElementById("workDesc");
const galleryEl = document.getElementById("workGallery");
const detailMain = document.querySelector(".detail");

const ROOT = "../../";

function getSlug() {
  return window.location.hash.replace(/^#/, "").trim();
}

function setDetailState(state) {
  if (!detailMain) return;
  detailMain.setAttribute("data-load-state", state);
  detailMain.setAttribute("aria-busy", state === "loading" ? "true" : "false");
}

function renderWork(work) {
  var title = workText(work.title);
  document.title = title + " — Su";

  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = workText(work.caption);
  if (descEl) descEl.textContent = workText(work.description);

  if (!galleryEl) return;
  galleryEl.innerHTML = "";

  (work.detailImages || []).forEach(function (item) {
    var url = workMediaUrl(item, ROOT);
    if (!url) return;

    var img = document.createElement("img");
    img.src = url;
    img.alt = title;
    img.loading = "lazy";
    img.addEventListener("click", function () {
      openLightbox(img.src, img.alt);
    });
    galleryEl.appendChild(img);
  });

  if (work.video) {
    var videoUrl = workMediaUrl(work.video, ROOT);
    if (videoUrl) {
      var video = document.createElement("video");
      video.src = videoUrl;
      video.controls = true;
      galleryEl.appendChild(video);
    }
  }

  setDetailState("ok");
}

function renderNotFound() {
  var en = typeof getLang === "function" && getLang() === "en";

  if (titleEl) {
    titleEl.textContent = en ? "Work not found" : "작품을 찾을 수 없습니다";
  }
  if (metaEl) metaEl.textContent = "";
  if (descEl) descEl.textContent = "";
  if (galleryEl) galleryEl.innerHTML = "";
  setDetailState("empty");
}

function renderLoadError() {
  var en = typeof getLang === "function" && getLang() === "en";

  if (titleEl) {
    titleEl.textContent = en ? "Could not load work" : "작품을 불러오지 못했습니다";
  }
  if (metaEl) metaEl.textContent = "";
  if (descEl) descEl.textContent = "";
  if (galleryEl) galleryEl.innerHTML = "";
  setDetailState("error");
}

function load() {
  var slug = getSlug();

  if (!slug) {
    renderNotFound();
    return;
  }

  setDetailState("loading");

  loadWorksData(ROOT).then(function (result) {
    if (result.status === "error") {
      renderLoadError();
      return;
    }

    var work = (result.works || []).find(function (w) {
      return w.slug === slug;
    });

    if (work) {
      renderWork(work);
    } else {
      renderNotFound();
    }
  });
}

load();
window.addEventListener("hashchange", load);
window.addEventListener("langchange", load);

/* ============================================================
   이미지 전체 화면 확대 (lightbox)
   ============================================================ */
var lightboxEl = null;

function lightboxLabel() {
  return typeof getLang === "function" && getLang() === "en"
    ? "Expanded image"
    : "확대 이미지";
}

function ensureLightbox() {
  if (lightboxEl) return lightboxEl;

  lightboxEl = document.createElement("div");
  lightboxEl.className = "detail-lightbox";
  lightboxEl.hidden = true;
  lightboxEl.setAttribute("role", "dialog");
  lightboxEl.setAttribute("aria-modal", "true");

  var img = document.createElement("img");
  img.className = "detail-lightbox__img";
  img.alt = "";
  lightboxEl.appendChild(img);

  lightboxEl.addEventListener("click", closeLightbox);
  document.body.appendChild(lightboxEl);
  document.addEventListener("keydown", onLightboxKeydown);

  return lightboxEl;
}

function openLightbox(src, alt) {
  var lb = ensureLightbox();
  var img = lb.querySelector(".detail-lightbox__img");
  img.src = src;
  img.alt = alt || "";
  lb.setAttribute("aria-label", lightboxLabel());
  lb.hidden = false;
  document.body.classList.add("detail-lightbox-open");
}

function closeLightbox() {
  if (!lightboxEl || lightboxEl.hidden) return;
  lightboxEl.hidden = true;
  lightboxEl.querySelector(".detail-lightbox__img").removeAttribute("src");
  document.body.classList.remove("detail-lightbox-open");
}

function onLightboxKeydown(e) {
  if (e.key === "Escape") closeLightbox();
}
