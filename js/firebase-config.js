// Import Firebase SDK functions
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGoOiUDU6r002oO_I34A006W32q8gbR0o",
  authDomain: "odyssey-0209vaibhav.firebaseapp.com",
  databaseURL: "https://odyssey-0209vaibhav-default-rtdb.firebaseio.com",
  projectId: "odyssey-0209vaibhav",
  storageBucket: "odyssey-0209vaibhav.firebasestorage.app",
  messagingSenderId: "874321448789",
  appId: "1:874321448789:web:99506b21981d9cbae8e9dc",
  measurementId: "G-589GPCGG4R"
};

// Initialize Firebase services
let app, analytics, auth, db, storage;

try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  console.log('Firebase client SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Export initialized services
export { app, analytics, auth, db, storage }; 