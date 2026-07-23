import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth } from "../firebase/app.js";

/**
 * Firebase Auth 오류 코드를 사용자용 메시지로 변환
 * (내부 오류 객체 전체는 노출하지 않음)
 */
export function getAuthErrorMessage(error) {
  const code = error && error.code;

  switch (code) {
    case "auth/invalid-email":
    case "auth/user-disabled":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "잘못된 이메일 또는 비밀번호입니다.";
    case "auth/too-many-requests":
      return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 오류가 발생했습니다. 연결을 확인해 주세요.";
    default:
      return "로그인에 실패했습니다. 다시 시도해 주세요.";
  }
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Firestore 쓰기 전 Auth 세션 확정
 * (로그인 직후 auth.currentUser는 있지만 토큰이 아직 없는 타이밍 방지)
 */
export async function ensureAdminSession() {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("ADMIN_REQUIRED");
  }

  await auth.currentUser.getIdToken();
  return auth.currentUser;
}

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}
