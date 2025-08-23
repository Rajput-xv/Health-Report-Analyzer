// client/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKpkat7ZnZoZgC18tDy2lEsCFhZqh_09Q",
  authDomain: "health-70961.firebaseapp.com",
  projectId: "health-70961",
  storageBucket: "health-70961.firebasestorage.app",
  messagingSenderId: "547655603708",
  appId: "1:547655603708:web:bb65b4ac426fdafadece79",
  measurementId: "G-MN9NG6SVZE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup };
