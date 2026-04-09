import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDsJpHK1lQ0n9r54yvUjcI6dQ_Nk-Si_BE",
    authDomain: "fitness-6d907.firebaseapp.com",
    projectId: "fitness-6d907",
    storageBucket: "fitness-6d907.firebasestorage.app",
    messagingSenderId: "349709501154",
    appId: "1:349709501154:web:cd9917c0d3943b439f94bb",
    measurementId: "G-F2Q6EWXH9J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
