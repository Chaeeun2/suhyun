/* ============================================================
   works 다국어 텍스트 헬퍼 (공용)
   - title / caption / description 은 Firestore { ko, en } 객체
   - 현재 언어: js/lang.js getLang() (localStorage 저장)
   ============================================================ */

function workText(field, lang) {
  if (!field) return "";
  if (typeof field === "string") return field;
  lang = lang || (typeof getLang === "function" ? getLang() : "ko");
  return field[lang] || field.ko || field.en || "";
}
