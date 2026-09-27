const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
try {
  if (!admin.apps.length && process.env.FIREBASE_CREDENTIALS) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  if (admin.apps.length) {
    db = admin.firestore();
  }
} catch (err) {
  console.error("Init Error:", err.message);
}

app.get('/', (req, res) => {
  res.send("API Gateway is Active!");
});

app.get('/api', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const accountNumber = req.query.account || req.body.account_number;
  const bankName = req.query.bank || req.body.bank_name || "DANA";
  
  if (!apiKey) {
    return res.status(401).json({ success: false, error: "Akses Ditolak: API Key tidak ditemukan." });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: "Database belum terhubung." });
  }

  try {
    const clientRef = db.collection('clients').doc(apiKey);
    const doc = await clientRef.get();

    if (!doc.exists) {
      return res.status(401).json({ success: false, error: "Akses Ditolak: API Key tidak valid." });
    }

    // Auto-update hit harian
    await clientRef.update({
      dailyHits: admin.firestore.FieldValue.increment(1),
      lastHitDate: new Date().toISOString()
    });

    // Format response sesuai permintaan persis dari klien
    res.json({
      success: true,
      account_number: accountNumber || "081234567890",
      account_name: "BUDI SANTOSO",
      bank_name: bankName.toUpperCase(),
      type: "ewallet"
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;