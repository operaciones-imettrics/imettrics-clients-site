import * as admin from 'firebase-admin';

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    admin.initializeApp();
}

export const db = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();
