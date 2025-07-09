import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLcPbnt7akPLP7wBeBgJvk6sB_5bRXvik",
    authDomain: "radicaltraining-b1eec.firebaseapp.com",
    projectId: "radicaltraining-b1eec",
    storageBucket: "radicaltraining-b1eec.appspot.com",
    messagingSenderId: "868998208820",
    appId: "1:868998208820:web:17237c6ddf70bd3c061961"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // ✅ correcto
