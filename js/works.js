/* ============================================================
   작품 목록 페이지 (work/)
   - data/works.js 를 불러 그리드/리스트로 렌더
   - 카테고리 필터 + grid/list 토글 + 리스트 호버 썸네일
   ============================================================ */

const ROOT = "../"; // work/ 기준 루트 경로

const worksEl = document.querySelector(".works");
const gridEl = document.getElementById("grid");
const listEl = document.getElementById("list");
const filtersEl = document.getElementById("filters");
const viewsEl = document.getElementById("views");
const previewEl = document.getElementById("preview");

/* 다국어 텍스트 (title / caption / description → { ko, en }) */
function pickText(field, lang) {
  if (!field) return "";
  if (typeof field === "string") return field;
  lang = lang || (typeof getLang === "function" ? getLang() : "ko");
  return field[lang] || field.ko || field.en || "";
}

let allWorks = [];
let currentCat = "all";
let currentView = "grid";

/* 상세 페이지 링크 (해시 슬러그) */
function detailUrl(work) {
  return `view/#${work.slug}`;
}

function filtered() {
  if (currentCat === "all") return allWorks;
  return allWorks.filter((w) => w.category === currentCat);
}

/* 그리드 렌더 */
function renderGrid() {
  gridEl.innerHTML = "";
  filtered().forEach((work) => {
    const a = document.createElement("a");
    a.className = "grid-item";
    a.href = detailUrl(work);

    const img = document.createElement("img");
    img.src = ROOT + work.thumbnail;
    img.alt = pickText(work.title);
    img.loading = "lazy";

    // 배경 박스(블렌드 없음) + 안쪽 글자(흰색 + 블렌드) 2겹 구조
    const title = document.createElement("span");
    title.className = "grid-item__title";
    const titleText = document.createElement("span");
    titleText.className = "grid-item__title-text";
    titleText.textContent = pickText(work.title);
    title.appendChild(titleText);

    a.append(img, title);
    gridEl.appendChild(a);
  });
}

/* 리스트 렌더 */
function renderList() {
  listEl.innerHTML = "";
  filtered().forEach((work) => {
    const row = document.createElement("a");
    row.className = "list-row blend-text";
    row.href = detailUrl(work);

    const title = document.createElement("span");
    title.className = "list-row__title";
    title.textContent = pickText(work.title);

    const cat = document.createElement("span");
    cat.className = "list-row__cat";
    cat.textContent = work.category;

    const date = document.createElement("span");
    date.className = "list-row__date";
    date.textContent = work.date;

    row.append(title, cat, date);

    // 호버 시 썸네일 미리보기
    row.addEventListener("mouseenter", () => {
      previewEl.src = ROOT + work.thumbnail;
      previewEl.classList.add("is-visible");
    });
    row.addEventListener("mouseleave", () => {
      previewEl.classList.remove("is-visible");
    });

    listEl.appendChild(row);
  });
}

function render() {
  try {
    renderGrid();
    renderList();
  } catch (err) {
    console.error("work render error:", err);
  }
  if (worksEl) {
    worksEl.classList.toggle("is-list-view", currentView === "list");
  }
}

/* 필터 클릭 */
filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (!btn) return;
  currentCat = btn.dataset.cat;
  filtersEl.querySelectorAll(".filter").forEach((b) => b.classList.toggle("is-active", b === btn));
  render();
});

/* 뷰 토글 */
viewsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".view");
  if (!btn) return;
  currentView = btn.dataset.view;
  viewsEl.querySelectorAll(".view").forEach((b) => b.classList.toggle("is-active", b === btn));
  render();
});

/* 썸네일이 마우스를 따라다니게 */
document.addEventListener("mousemove", (e) => {
  previewEl.style.left = `${e.clientX}px`;
  previewEl.style.top = `${e.clientY}px`;
});

/* 데이터 로드 */
loadWorksData(ROOT)
  .then((data) => {
    allWorks = data;
    render();
  })
  .catch((err) => {
    console.error("works.js load error:", err);
    if (gridEl) gridEl.innerHTML = "";
    if (listEl) listEl.innerHTML = "";
  });

window.addEventListener("langchange", render);
