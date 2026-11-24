import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web config. It is public by design: what protects the data is the
// Firestore security rules (each person can only read their own chats).
// Names must be written out in full so Next.js can inline them.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Firebase auth + database, or null when the config is missing (the app then works on-device only). */
export function getFirebase() {
  if (!config.apiKey || !config.projectId) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  return { auth: getAuth(app), db: getFirestore(app) };
}
