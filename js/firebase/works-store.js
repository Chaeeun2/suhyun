import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./app.js";
import { mapWorkDoc, sortWorks } from "./work-map.js";

const WORKS_COLLECTION = "works";

/**
 * 공개 포트폴리오 목록 조회 (인증 불필요)
 * order(sortOrder) 내림차순 → createdAt 내림차순
 */
export async function fetchWorksList() {
  const snapshot = await getDocs(collection(db, WORKS_COLLECTION));
  const works = snapshot.docs.map(mapWorkDoc);
  return sortWorks(works);
}
