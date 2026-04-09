import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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

// Functions: región europe-west1 (menor latencia desde España, ver firebase.json)
export const functions = getFunctions(app, 'europe-west1');

// Emulador: activar vía env var VITE_USE_FIREBASE_EMULATOR=true para dev local
// Arrancar previamente: `firebase emulators:start --only functions,firestore,auth`
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    // eslint-disable-next-line no-console
    console.log('🔧 Connecting to Firebase Functions emulator at localhost:5001');
    connectFunctionsEmulator(functions, 'localhost', 5001);
}
