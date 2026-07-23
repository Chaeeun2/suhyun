import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "../admin/firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
