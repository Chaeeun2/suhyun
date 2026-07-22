/* ============================================================
   works.json 다국어 텍스트 헬퍼 (공용)
   - title / caption / description 은 { ko, en } 객체 (data/works.js 백틱 문자열)
   - 현재 기본 언어: ko (추후 en 버튼 연동 시 lang 전달)
   ============================================================ */

function workText(field, lang) {
  if (!field) return "";
  if (typeof field === "string") return field;
  lang = lang || "ko";
  return field[lang] || field.ko || field.en || "";
}
