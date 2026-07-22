/* ============================================================
   About 데이터 로더
   - data/about.js 의 ABOUT_RAW 를 불러옴
   ============================================================ */

function loadAboutData(basePath) {
  basePath = basePath || "";

  if (window.ABOUT_RAW) {
    return Promise.resolve(window.ABOUT_RAW);
  }

  return new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    script.src = basePath + "data/about.js";
    script.onload = function () {
      resolve(window.ABOUT_RAW || {});
    };
    script.onerror = function () {
      reject(new Error("about.js load failed"));
    };
    document.head.appendChild(script);
  });
}
