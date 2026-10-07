// Firebase Admin (server-side). The bot's data lives under /bbcWA, completely separate from /bbcOS,
// because the Agency OS front-end rewrites the whole /bbcOS node on every save and would erase bot writes.
const admin = require('firebase-admin');

let _db;
function getDb() {
  if (_db) return _db;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is missing');
  let json;
  try {
    json = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be the service-account JSON (plain or base64)');
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(json),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://bbc-os-default-rtdb.asia-southeast1.firebasedatabase.app'
    });
  }
  _db = admin.database();
  return _db;
}

const ref = p => getDb().ref(`bbcWA/${p}`);

module.exports = { getDb, ref };
