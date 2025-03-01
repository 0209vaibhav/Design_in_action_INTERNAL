// ---------------------------
// Firebase Configuration Module
// ---------------------------

// ---------------------------
// 1) Firebase Configuration
// ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCGoOiUDU6r002oO_I34A006W32q8gbR0o",
  authDomain: "odyssey-0209vaibhav.firebaseapp.com",
  projectId: "odyssey-0209vaibhav",
  storageBucket: "odyssey-0209vaibhav.appspot.com",
  messagingSenderId: "874321448789",
  appId: "1:874321448789:web:99506b21981d9cbae8e9dc",
  measurementId: "G-589GPCGG4R"
};

// ---------------------------
// 2) Firebase Initialization
// ---------------------------
// Initialize core Firebase app
firebase.initializeApp(firebaseConfig);

// ---------------------------
// 3) Analytics Setup
// ---------------------------
// Initialize Firebase Analytics service
const analytics = firebase.analytics(); 