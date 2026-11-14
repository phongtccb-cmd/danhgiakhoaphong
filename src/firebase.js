import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAYjOiXk9Ap1PwiA7BRnU80cflxjfrYmqk',
  authDomain: 'danhgiakhoaphong.firebaseapp.com',
  projectId: 'danhgiakhoaphong',
  appId: '1:644793887628:web:afd26dc0322150914b84a9',
})

export const auth = getAuth(app)
export const db = getFirestore(app)
export const ADMIN_UID = 'SqJkboauioaobP2zqNtJMhb0SkB3'
