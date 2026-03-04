// ─────────────────────────────────────────────────────────────
//  Firebase Configuration — EXAMPLE FILE
//  Copy this file to firebase-config.js and fill in your values.
//
//  SETUP INSTRUCTIONS:
//  1. Go to https://console.firebase.google.com/
//  2. Create a new project (or use an existing one)
//  3. Enable Authentication → Sign-in method → Google
//  4. Enable Cloud Firestore (start in production mode)
//  5. Go to Project Settings → General → Your apps → Web app
//  6. Register a web app and copy the config values below
//  7. Deploy the Firestore security rules from firestore.rules
//  8. Enable 2-Step Verification on your Google account
//     (thovexii@gmail.com) for full 2FA protection
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
