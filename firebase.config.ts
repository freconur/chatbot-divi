import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
// import { getFirestore,collection } from 'firebase/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import dotenv from 'dotenv'
dotenv.config()
initializeApp({
  credential: cert(JSON.parse(process.env.PRIVATE_KEY))
});

export const db = getFirestore()