// src/config/firebase.js
const admin = require('firebase-admin');
const path = require('path');
// path to env + the file name
const serviceAccount = path.join(__dirname, '..', '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_RTDB_URL,
  
});

const db = admin.firestore(); // For Firestore
const dbRT = admin.database(); // For Realtime Database

module.exports = { db, dbRT, admin };