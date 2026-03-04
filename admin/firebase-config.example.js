// ─────────────────────────────────────────────────────────────
//  Firebase Configuration — EXAMPLE FILE
//
//  This file is NOT used directly. The real firebase-config.js
//  is generated at deploy time from GitHub repository secrets.
//
//  SETUP INSTRUCTIONS:
//  1. Go to https://console.firebase.google.com/
//  2. Create a new project (or use an existing one)
//  3. Enable Authentication → Sign-in method → Google
//  4. Enable Cloud Firestore (start in production mode)
//  5. Go to Project Settings → General → Your apps → Web app
//  6. Register a web app and copy the config values
//  7. Deploy the Firestore security rules from firestore.rules
//  8. Enable 2-Step Verification on your Google account
//     (thovexii@gmail.com) for full 2FA protection
//
//  GITHUB SECRETS (required for deploy):
//  Go to your repo → Settings → Secrets and variables → Actions
//  Add these repository secrets:
//
//    FIREBASE_API_KEY            — Your Firebase API key
//    FIREBASE_AUTH_DOMAIN        — e.g. your-project.firebaseapp.com
//    FIREBASE_PROJECT_ID         — Your Firebase project ID
//    FIREBASE_STORAGE_BUCKET     — e.g. your-project.appspot.com
//    FIREBASE_MESSAGING_SENDER_ID — Your messaging sender ID
//    FIREBASE_APP_ID             — Your Firebase app ID
//
//  The deploy workflow (.github/workflows/deploy.yml) will
//  generate admin/firebase-config.js from these secrets
//  automatically on every deploy.
//
//  OPTIONAL — TOTP MFA (requires Firebase Identity Platform):
//  1. In Firebase Console → Authentication → Settings
//  2. Enable "Multi-factor authentication"
//  3. Enable TOTP as a second factor
//  Note: This requires the Blaze (pay-as-you-go) plan
//
//  OPTIONAL — GitHub Publishing:
//  1. Create a GitHub Personal Access Token (classic)
//     at https://github.com/settings/tokens
//  2. Grant it "repo" scope (for committing projects.json)
//  3. Enter the token in the CMS Settings panel
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
