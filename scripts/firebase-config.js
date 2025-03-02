
// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    deleteDoc,
    getDoc, 
    setDoc, 
    updateDoc,
    query,
    where,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    // Replace with your actual Firebase config
    apiKey: "AIzaSyDpuDTeivRQ-BSW_RxPx6lT7rImqv2nFPw",
    authDomain: "shuttershare-b9ae1.firebaseapp.com",
    projectId: "shuttershare-b9ae1",
    storageBucket: "shuttershare-b9ae1.appspot.com",
    messagingSenderId: "405192146952",
    appId: "1:405192146952:web:dacca68908be7f0a0d11bd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export Firebase modules
export { 
    db, 
    auth, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    query,
    where,
    serverTimestamp ,
    deleteDoc
};