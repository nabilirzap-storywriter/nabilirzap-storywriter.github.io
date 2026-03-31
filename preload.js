import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// PASTE KODE FIREBASE KAMU DI SINI
const firebaseConfig = {
  apiKey: "AIzaSyB_aesyRyMJftF1y9AQn6MiLWu0XTdKL4g",
  authDomain: "the-name-vault-d9a8f.firebaseapp.com",
  projectId: "the-name-vault-d9a8f",
  storageBucket: "the-name-vault-d9a8f.firebasestorage.app",
  messagingSenderId: "607838251875",
  appId: "1:607838251875:web:91862a55886277ce100156"
};

// Inisialisasi Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export agar bisa dipakai oleh main.js
export { db, collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy };
