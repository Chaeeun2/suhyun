/* ============================================================
   작품 목록 페이지 (work/)
   - Firestore works 컬렉션 → 그리드/리스트 렌더
   - 카테고리 필터 + grid/list 토글 + 리스트 호버 썸네일
   ============================================================ */

const ROOT = "../";

const worksEl = document.querySelector(".works");
const gridEl = document.getElementById("grid");
const listEl = document.getElementById("list");
const filtersEl = document.getElementById("filters");
const viewsEl = document.getElementById("views");
const previewEl = document.getElementById("preview");

let statusEl = null;

function pickText(field, lang) {
  if (!field) return "";
  if (typeof field === "string") return field;
  lang = lang || (typeof getLang === "function" ? getLang() : "ko");
  return field[lang] || field.ko || field.en || "";
}

function statusMessage(status) {
  var en = typeof getLang === "function" && getLang() === "en";

  if (status === "loading") {
    return en ? "Loading works…" : "작품을 불러오는 중…";
  }
  if (status === "empty") {
    return en ? "No works to display." : "등록된 작품이 없습니다.";
  }
  if (status === "error") {
    return en ? "Could not load works." : "작품을 불러오지 못했습니다.";
  }
  return "";
}

function ensureStatusEl() {
  if (statusEl || !worksEl) return statusEl;

  statusEl = document.createElement("p");
  statusEl.id = "worksStatus";
  statusEl.className = "works__status blend-text";
  statusEl.hidden = true;
  statusEl.setAttribute("aria-live", "polite");
  worksEl.insertBefore(statusEl, gridEl);
  return statusEl;
}

function setPageState(status) {
  if (worksEl) {
    worksEl.setAttribute("data-load-state", status);
    worksEl.setAttribute("aria-busy", status === "loading" ? "true" : "false");
  }

  var el = ensureStatusEl();
  if (!el) return;

  if (status === "ok") {
    el.hidden = true;
    el.textContent = "";
    return;
  }

  el.hidden = false;
  el.textContent = statusMessage(status);
}

let allWorks = [];
let currentCat = "all";
let currentView = "grid";

function detailUrl(work) {
  return "view/#" + work.slug;
}

function filtered() {
  if (currentCat === "all") return allWorks;
  return allWorks.filter(function (w) {
    return w.category === currentCat;
  });
}

function renderGrid() {
  if (!gridEl) return;
  gridEl.innerHTML = "";

  filtered().forEach(function (work) {
    var thumbUrl = workMediaUrl(work.thumbnail, ROOT);
    if (!thumbUrl) return;

    var a = document.createElement("a");
    a.className = "grid-item";
    a.href = detailUrl(work);

    var img = document.createElement("img");
    img.src = thumbUrl;
    img.alt = pickText(work.title);
    img.loading = "lazy";

    var title = document.createElement("span");
    title.className = "grid-item__title";
    var titleText = document.createElement("span");
    titleText.className = "grid-item__title-text";
    titleText.textContent = pickText(work.title);
    title.appendChild(titleText);

    a.append(img, title);
    gridEl.appendChild(a);
  });
}

function renderList() {
  if (!listEl) return;
  listEl.innerHTML = "";

  filtered().forEach(function (work) {
    var row = document.createElement("a");
    row.className = "list-row blend-text";
    row.href = detailUrl(work);

    var title = document.createElement("span");
    title.className = "list-row__title";
    title.textContent = pickText(work.title);

    var cat = document.createElement("span");
    cat.className = "list-row__cat";
    cat.textContent = work.category;

    var date = document.createElement("span");
    date.className = "list-row__date";
    date.textContent = work.date;

    row.append(title, cat, date);

    row.addEventListener("mouseenter", function () {
      var url = workMediaUrl(work.thumbnail, ROOT);
      if (!url || !previewEl) return;
      previewEl.src = url;
      previewEl.classList.add("is-visible");
    });
    row.addEventListener("mouseleave", function () {
      if (previewEl) previewEl.classList.remove("is-visible");
    });

    listEl.appendChild(row);
  });
}

function render() {
  var items = filtered();

  if (allWorks.length === 0) {
    if (gridEl) gridEl.innerHTML = "";
    if (listEl) listEl.innerHTML = "";
  } else if (items.length === 0) {
    if (gridEl) gridEl.innerHTML = "";
    if (listEl) listEl.innerHTML = "";
    var el = ensureStatusEl();
    if (el) {
      var en = typeof getLang === "function" && getLang() === "en";
      el.hidden = false;
      el.textContent = en
        ? "No works in this category."
        : "해당 카테고리에 작품이 없습니다.";
    }
  } else {
    setPageState("ok");
    try {
      renderGrid();
      renderList();
    } catch (err) {
      console.error("work render error:", err);
    }
  }

  if (worksEl) {
    worksEl.classList.toggle("is-list-view", currentView === "list");
  }
}

if (filtersEl) {
  filtersEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter");
    if (!btn) return;
    currentCat = btn.dataset.cat;
    filtersEl.querySelectorAll(".filter").forEach(function (b) {
      b.classList.toggle("is-active", b === btn);
    });
    render();
  });
}

if (viewsEl) {
  viewsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".view");
    if (!btn) return;
    currentView = btn.dataset.view;
    viewsEl.querySelectorAll(".view").forEach(function (b) {
      b.classList.toggle("is-active", b === btn);
    });
    render();
  });
}

if (previewEl) {
  document.addEventListener("mousemove", function (e) {
    previewEl.style.left = e.clientX + "px";
    previewEl.style.top = e.clientY + "px";
  });
}

setPageState("loading");

loadWorksData(ROOT).then(function (result) {
  allWorks = result.works || [];

  if (result.status === "error") {
    setPageState("error");
    if (gridEl) gridEl.innerHTML = "";
    if (listEl) listEl.innerHTML = "";
    return;
  }

  if (result.status === "empty") {
    setPageState("empty");
    if (gridEl) gridEl.innerHTML = "";
    if (listEl) listEl.innerHTML = "";
    return;
  }

  render();
});

window.addEventListener("langchange", function () {
  var state = worksEl && worksEl.getAttribute("data-load-state");
  if (state && state !== "ok") {
    setPageState(state);
  } else {
    render();
  }
});
