/* ============================================================
   About 페이지 (about/)
   - data/about.js 를 불러 CV·소개·연락처 렌더
   - langchange 시 현재 언어로 다시 그림
   ============================================================ */

const ROOT = "../";
const cvEl = document.getElementById("aboutCv");
const textEl = document.getElementById("aboutText");
const contactEl = document.getElementById("aboutContact");

let aboutData = null;

function currentLang() {
  return typeof getLang === "function" ? getLang() : "ko";
}

function t(field) {
  return workText(field, currentLang());
}

function createCvLabel(labelField) {
  const h2 = document.createElement("h2");
  h2.className = "cv-block__label";
  const span = document.createElement("span");
  span.className = currentLang() === "ko" ? "ko-narrow" : "cv-block__label-text";
  span.textContent = t(labelField);
  h2.appendChild(span);
  return h2;
}

function createCvRows(rows) {
  const wrap = document.createElement("div");
  wrap.className = "cv-block__rows";

  rows.forEach(function (row) {
    const rowEl = document.createElement("div");
    rowEl.className = "cv-row";

    const year = document.createElement("span");
    year.className = "cv-row__year";
    year.textContent = row.year;

    const desc = document.createElement("span");
    desc.className = "cv-row__desc";
    desc.textContent = t(row.desc);

    rowEl.append(year, desc);
    wrap.appendChild(rowEl);
  });

  return wrap;
}

function renderCv(data) {
  cvEl.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "cv-grid";

  (data.cvGrid || []).forEach(function (section) {
    const block = document.createElement("section");
    block.className = "cv-block";
    block.append(createCvLabel(section.label), createCvRows(section.rows));
    grid.appendChild(block);
  });

  cvEl.appendChild(grid);

  if (data.cvClient) {
    const clientBlock = document.createElement("section");
    clientBlock.className = "cv-block cv-block--full";

    const rows = document.createElement("div");
    rows.className = "cv-block__rows";

    const row = document.createElement("div");
    row.className = "cv-row cv-row--full";

    const desc = document.createElement("span");
    desc.className = "cv-row__desc";
    desc.textContent = t(data.cvClient.text);

    row.appendChild(desc);
    rows.appendChild(row);
    clientBlock.append(createCvLabel(data.cvClient.label), rows);
    cvEl.appendChild(clientBlock);
  }
}

function renderIntro(data) {
  textEl.innerHTML = "";

  const name = document.createElement("p");
  name.className = "about__name";
  name.textContent = t(data.intro.name);
  textEl.appendChild(name);

  (data.intro.paragraphs || []).forEach(function (para) {
    const p = document.createElement("p");
    const html = t(para);
    if (html.indexOf("<") !== -1) {
      p.innerHTML = html;
    } else {
      p.textContent = html;
    }
    textEl.appendChild(p);
  });
}

function renderContact(data) {
  contactEl.innerHTML = "";

  (data.contact || []).forEach(function (item) {
    const row = document.createElement("div");
    row.className = "contact-row";

    const label = document.createElement("span");
    label.className = "contact-row__label";
    label.textContent = item.label;

    const value = document.createElement("span");
    value.className = "contact-row__value";
    value.textContent = item.value;

    row.append(label, value);
    contactEl.appendChild(row);
  });
}

function render() {
  if (!aboutData || !cvEl || !textEl || !contactEl) return;
  renderCv(aboutData);
  renderIntro(aboutData);
  renderContact(aboutData);
}

loadAboutData(ROOT)
  .then(function (data) {
    aboutData = data;
    render();
  })
  .catch(function (err) {
    console.error("about.js load error:", err);
  });

window.addEventListener("langchange", render);
