import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../firebase/app.js";
import { ensureAdminSession } from "./auth.js";
import {
  mapWorkDoc,
  sortWorks,
  makeWorkId,
  sanitizeWorkInput,
} from "../firebase/work-map.js";

const WORKS_COLLECTION = "works";

async function requireAdmin() {
  await ensureAdminSession();
}

/**
 * Firestore 오류를 사용자용 메시지로 변환
 */
export function getWorksErrorMessage(error) {
  const code = error && error.code;

  switch (code) {
    case "permission-denied":
      return "Firestore 접근이 거부되었습니다. 로그인 상태를 확인하거나 Firestore Rules 배포 여부를 확인해 주세요.";
    case "not-found":
      return "작품을 찾을 수 없습니다.";
    case "already-exists":
      return "같은 ID의 작품이 이미 있습니다.";
    case "unavailable":
    case "deadline-exceeded":
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
    default:
      if (error && error.message === "ADMIN_REQUIRED") {
        return "관리자 로그인이 필요합니다.";
      }
      return "요청을 처리하지 못했습니다. 다시 시도해 주세요.";
  }
}

export { makeWorkId };

/**
 * 작품 추가 (문서 ID = slug)
 * @param {string} workId Firestore 문서 ID
 * @param {object} workData 작품 데이터
 */
export async function createWork(workId, workData) {
  await requireAdmin();

  const id = String(workId || "").trim();
  if (!id) {
    throw new Error("INVALID_WORK_ID");
  }

  const ref = doc(db, WORKS_COLLECTION, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const err = new Error("Work already exists");
    err.code = "already-exists";
    throw err;
  }

  await setDoc(ref, {
    ...sanitizeWorkInput(workData),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return id;
}

/**
 * 작품 1건 조회
 */
export async function getWork(workId) {
  const ref = doc(db, WORKS_COLLECTION, workId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return mapWorkDoc(snapshot);
}

/**
 * 작품 목록 조회
 */
export async function listWorks() {
  const snapshot = await getDocs(collection(db, WORKS_COLLECTION));
  return sortWorks(snapshot.docs.map(mapWorkDoc));
}

/**
 * 작품 수정 (문서 ID 변경 불가)
 */
export async function updateWork(workId, workData) {
  await requireAdmin();

  const id = String(workId || "").trim();
  if (!id) {
    throw new Error("INVALID_WORK_ID");
  }

  const ref = doc(db, WORKS_COLLECTION, id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    const err = new Error("Work not found");
    err.code = "not-found";
    throw err;
  }

  await updateDoc(ref, {
    ...sanitizeWorkInput(workData),
    updatedAt: serverTimestamp(),
  });

  return id;
}

/**
 * 작품 삭제
 */
export async function deleteWork(workId) {
  await requireAdmin();

  const id = String(workId || "").trim();
  if (!id) {
    throw new Error("INVALID_WORK_ID");
  }

  await deleteDoc(doc(db, WORKS_COLLECTION, id));
  return id;
}

/**
 * sortOrder 일괄 저장 (드래그 순서 변경)
 */
export async function updateWorksSortOrder(updates) {
  await requireAdmin();

  if (!Array.isArray(updates) || updates.length === 0) return;

  await Promise.all(
    updates.map(function (item) {
      const id = String(item.id || "").trim();
      if (!id) return Promise.resolve();

      return updateDoc(doc(db, WORKS_COLLECTION, id), {
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
        updatedAt: serverTimestamp(),
      });
    }),
  );
}
