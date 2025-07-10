const firebaseLeaderboardConfig = {
  apiKey: "AIzaSyA684sh9WLH9Z6JcGsJ2cjxWKX3vjdkpbE",
  authDomain: "globalf1-d0444.firebaseapp.com",
  projectId: "globalf1-d0444",
  storageBucket: "globalf1-d0444.firebasestorage.app",
  messagingSenderId: "640797727470",
  appId: "1:640797727470:web:1afa575185e3ffd60d31ff",
  measurementId: "G-43N13W6WEN"
};

   const firebaseLeaderboardApp = firebase.initializeApp(firebaseLeaderboardConfig, 'leaderboardApp');
    const dbLeaderboard = firebaseLeaderboardApp.firestore();
    console.log('Firebase Leaderboard App initialized:', firebaseLeaderboardApp.name);

// Initialize Firebase

// firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();
// window.db = db; // <-- THIS LINE is important

// console.log("Firestore DB initialized:", db);