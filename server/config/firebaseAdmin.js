// Firebase Admin initialization for verifying Google sign-in (Firebase) ID tokens.
//
// Configure ONE of the following in the server .env:
//   1. FIREBASE_SERVICE_ACCOUNT  = the full service-account JSON as a single-line string
//   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY  (private key with \n escaped)
//   3. GOOGLE_APPLICATION_CREDENTIALS = absolute path to a service-account JSON file
//
// Until one is set, /api/auth/google-auth rejects all requests (fail closed).
const admin = require('firebase-admin');

let initialized = false;

function initFirebaseAdmin() {
  if (initialized || admin.apps.length) {
    initialized = true;
    return;
  }

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Support keys stored with literal "\n" sequences in env files
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    } else {
      console.warn(
        '⚠️  Firebase Admin is not configured. Google sign-in will be rejected until you set ' +
        'FIREBASE_SERVICE_ACCOUNT (or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY).'
      );
      return;
    }

    admin.initializeApp({ credential });
    initialized = true;
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('Firebase Admin initialization failed:', err.message);
  }
}

function isFirebaseConfigured() {
  return initialized || admin.apps.length > 0;
}

/**
 * Verify a Firebase ID token issued to the client after Google sign-in.
 * @param {string} idToken
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>}
 * @throws {Error} with code 'not_configured' if Firebase Admin has no credentials,
 *                 or a verification error if the token is invalid/expired.
 */
async function verifyFirebaseIdToken(idToken) {
  initFirebaseAdmin();
  if (!isFirebaseConfigured()) {
    const err = new Error('Firebase Admin not configured');
    err.code = 'not_configured';
    throw err;
  }
  return admin.auth().verifyIdToken(idToken);
}

module.exports = { initFirebaseAdmin, isFirebaseConfigured, verifyFirebaseIdToken };
