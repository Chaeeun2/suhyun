/* ============================================================
   사이트 언어 전환 (헤더 en/ko 버튼)
   - localStorage에 선택 저장 → 페이지 이동 후에도 유지
   - langchange 이벤트로 각 페이지 콘텐츠 갱신
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "suhyun-lang";
  var current = localStorage.getItem(STORAGE_KEY) || "ko";
  if (current !== "ko" && current !== "en") current = "ko";

  function getLang() {
    return current;
  }

  function setLang(lang) {
    if (lang !== "ko" && lang !== "en") return;
    if (current === lang) return;
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    syncButtons();
    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
  }

  function toggleLang() {
    setLang(current === "ko" ? "en" : "ko");
  }

  function syncButtons() {
    var buttons = document.querySelectorAll(".nav__lang");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      btn.textContent = current === "ko" ? "en" : "ko";
      btn.setAttribute("aria-pressed", current === "en" ? "true" : "false");
      btn.classList.toggle("is-active", current === "en");
    }
  }

  function init() {
    document.documentElement.lang = current;
    syncButtons();
    var buttons = document.querySelectorAll(".nav__lang");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", toggleLang);
    }
  }

  window.getLang = getLang;
  window.setLang = setLang;
  window.toggleLang = toggleLang;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
