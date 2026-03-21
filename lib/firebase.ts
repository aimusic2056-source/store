// Firebase configuration and initialization
import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAD5Rff9jZZE27-8oyj2OONAVTnaiBxUeo",
  authDomain: "aletwende.firebaseapp.com",
  databaseURL: "https://aletwende-default-rtdb.firebaseio.com",
  projectId: "aletwende",
  storageBucket: "aletwende.firebasestorage.app",
  messagingSenderId: "142861545293",
  appId: "1:142861545293:web:7cefd83f005dc12de19104",
  measurementId: "G-R9FCMY742N"
}

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Firebase services
export const auth = getAuth(app)

// Initialize Firestore with persistent cache (new recommended API)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})

export default app
