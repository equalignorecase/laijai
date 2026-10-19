import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";
import { getClientEnv } from "../env";

const env = getClientEnv();

const firebaseConfig = {
  apiKey: env.apiKey,
  authDomain: env.authDomain,
  projectId: env.projectId,
  storageBucket: env.storageBucket,
  messagingSenderId: env.messagingSenderId,
  appId: env.appId,
};

// Singleton instance
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const firestore: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

// Connect to Emulators if configured or in emulator mode
const isBrowser = typeof window !== "undefined";
const emulatorHost = isBrowser ? window.location.hostname : "127.0.0.1";

declare global {
  var __FIREBASE_EMULATORS_CONNECTED__: boolean | undefined;
}

if (env.useEmulator && !globalThis.__FIREBASE_EMULATORS_CONNECTED__) {
  try {
    connectFirestoreEmulator(firestore, emulatorHost, 8080);
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectStorageEmulator(storage, emulatorHost, 9199);
    globalThis.__FIREBASE_EMULATORS_CONNECTED__ = true;
    console.log("Firebase connected to local Emulator Suite (Auth: 9099, Firestore: 8080, Storage: 9199)");
  } catch (error) {
    console.debug("Firebase emulator connection warning:", error);
  }
}

export { app, firestore, auth, storage };
