// ─────────────────────────────────────────────────────────────
//  Firebase Configuration — EXAMPLE FILE
//
//  Copy this file to firebase-config.js and fill in your
//  Firebase project values. Firebase client-side config keys
//  are safe to commit — security is enforced by Firebase
//  Security Rules and Auth settings, not by hiding these keys.
//
//  SETUP INSTRUCTIONS:
//  1. Go to https://console.firebase.google.com/
//  2. Create a new project (or use an existing one)
//  3. Enable Authentication → Sign-in method → Google
//  4. Enable Cloud Firestore (start in production mode)
//  5. Go to Project Settings → General → Your apps → Web app
//  6. Register a web app and copy the config values
//  7. Copy this file to firebase-config.js and paste your values
//  8. Deploy the Firestore security rules from firestore.rules
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

export default firebaseConfig;
