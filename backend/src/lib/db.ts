import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (getApps().length === 0) {
  // In App Hosting (Cloud Run), GOOGLE_APPLICATION_CREDENTIALS is set automatically.
  // Locally, applicationDefault() falls through to the emulator if FIRESTORE_EMULATOR_HOST is set.
  initializeApp({ credential: applicationDefault() })
}

export const db = getFirestore()
