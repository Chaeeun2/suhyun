import { watchAuth, loginWithEmail, getAuthErrorMessage } from "./auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

const DEFAULT_BUTTON_LABEL = "로그인";
const LOADING_BUTTON_LABEL = "로그인 중...";

let isSubmitting = false;

watchAuth((user) => {
  if (user) {
    window.location.replace("/admin");
  }
});

function setLoading(loading) {
  isSubmitting = loading;
  loginButton.disabled = loading;
  loginButton.textContent = loading ? LOADING_BUTTON_LABEL : DEFAULT_BUTTON_LABEL;
  emailInput.disabled = loading;
  passwordInput.disabled = loading;
}

function showError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

function hideError() {
  loginError.hidden = true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  hideError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("이메일과 비밀번호를 입력해 주세요.");
    return;
  }

  setLoading(true);

  try {
    await loginWithEmail(email, password);
    window.location.replace("/admin");
  } catch (error) {
    showError(getAuthErrorMessage(error));
  } finally {
    passwordInput.value = "";
    setLoading(false);
  }
});
