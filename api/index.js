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
  
  if (!apiKey) {
    return res.status(401).json({ error: "Akses Ditolak: API Key tidak ditemukan." });
  }

  if (!db) {
    return res.status(500).json({ error: "Database belum terhubung. Periksa format JSON di FIREBASE_CREDENTIALS Vercel." });
  }

  try {
    const clientRef = db.collection('clients').doc(apiKey);
    const doc = await clientRef.get();

    if (!doc.exists) {
      return res.status(401).json({ error: "Akses Ditolak: API Key tidak valid." });
    }

    const clientData = doc.data();
    
    await clientRef.update({
      dailyHits: admin.firestore.FieldValue.increment(1),
      lastHitDate: new Date().toISOString()
    });

    res.json({
      status: "Berhasil",
      klien: clientData.namaKlien || "Client",
      pesan: "Inquiry account gateway berhasil dijalankan."
    });

  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;