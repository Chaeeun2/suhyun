/* ============================================================
   작품 상세 페이지 (work/view/#slug)
   - URL 해시에서 슬러그를 읽어 works.js 데이터에서 작품을 찾아 렌더
   → JSON에 작품을 추가하면 자동으로 상세 페이지가 생기는 구조
   ============================================================ */

const titleEl = document.getElementById("workTitle");
const metaEl = document.getElementById("workMeta");
const descEl = document.getElementById("workDesc");
const galleryEl = document.getElementById("workGallery");

/* 상세 페이지는 work/view/ 안에 있으므로 루트까지 ../../ 로 올라간다 */
const ROOT = "../../";

function getSlug() {
  return window.location.hash.replace(/^#/, "").trim();
}

function renderWork(work) {
  const title = workText(work.title);
  document.title = `${title} — Su`;
  titleEl.textContent = title;

  metaEl.textContent = workText(work.caption);
  descEl.textContent = workText(work.description);

  galleryEl.innerHTML = "";
  (work.detailImages || []).forEach((src) => {
    const img = document.createElement("img");
    img.src = ROOT + src;
    img.alt = title;
    img.loading = "lazy";
    galleryEl.appendChild(img);
  });

  if (work.video) {
    const video = document.createElement("video");
    video.src = ROOT + work.video;
    video.controls = true;
    galleryEl.appendChild(video);
  }
}

function renderNotFound() {
  titleEl.textContent = "작품을 찾을 수 없습니다";
  galleryEl.innerHTML = "";
}

function load() {
  loadWorksData(ROOT)
    .then((works) => {
      const slug = getSlug();
      const work = works.find((w) => w.slug === slug);
      work ? renderWork(work) : renderNotFound();
    })
    .catch(() => renderNotFound());
}

load();
window.addEventListener("hashchange", load);
