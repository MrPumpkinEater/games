 const firebaseConfig = {
    apiKey: "AIzaSyB0MVyzSGYRRiWd8OE1TN2jnnDnAJhCjxE",
    authDomain: "game-3d8df.firebaseapp.com",
    projectId: "game-3d8df",
    storageBucket: "game-3d8df.firebasestorage.app",
    messagingSenderId: "424547114956",
    appId: "1:424547114956:web:4af798eb128e8cb6e70769",
    measurementId: "G-L0N9X2FW2X"
  };

  // Initialize Firebase
 

 
firebase.initializeApp(firebaseConfig);

// ✅ Initialize and export Firestore globally
const db = firebase.firestore();
window.db = db; // <-- THIS LINE is important

console.log("Firestore DB initialized:", db);
