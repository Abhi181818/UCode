import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyCppaJUrp-Gzxa8yDDitphVbVdAUMSnuUc",
  authDomain: "ucode-44860.firebaseapp.com",
  projectId: "ucode-44860",
  storageBucket: "ucode-44860.firebasestorage.app",
  messagingSenderId: "828518000950",
  appId: "1:828518000950:web:cdfe0b257fdcd7483fab97",
  measurementId: "G-LLF4753QY9",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
