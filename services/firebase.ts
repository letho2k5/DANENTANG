import Constants from "expo-constants";
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = (Constants.expoConfig as any)?.extra?.firebaseConfig;

if (!firebaseConfig) {
  throw new Error("Missing firebaseConfig in app.json extra");
}

// tránh khởi tạo nhiều lần khi hot reload
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
