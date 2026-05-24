import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyApmyVUyBm38nB2IxIwzOXGqTirAkD7gLo",
  authDomain: "enzomnia-f6386.firebaseapp.com",
  projectId: "enzomnia-f6386",
  storageBucket: "enzomnia-f6386.firebasestorage.app",
  messagingSenderId: "567819993725",
  appId: "1:567819993725:web:250285725372657b53a714",
  measurementId: "G-H7BNS86YZR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, analytics, auth, googleProvider, db };
