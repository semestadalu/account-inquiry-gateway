const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Firebase Anti-Crash
if (!admin.apps.length) {
  try {
    // Membaca dan mem-parsing JSON dari Environment Variable Vercel
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Gagal membaca FIREBASE_CREDENTIALS:", error);
  }
}

const db = admin.firestore();

// Route Dasar (Untuk mengecek mesin hidup atau mati)
app.get('/', (req, res) => {
  res.send("API Gateway is Active!");
});

// Route Utama API Gateway
app.get('/api', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  // Validasi jika API Key tidak dikirim
  if (!apiKey) {
    return res.status(401).json({ error: "Akses Ditolak: API Key tidak ditemukan." });
  }

  try {
    const clientRef = db.collection('clients').doc(apiKey);
    const doc = await clientRef.get();

    // Validasi jika API Key salah / tidak ada di database
    if (!doc.exists) {
      return res.status(401).json({ error: "Akses Ditolak: API Key tidak valid." });
    }

    const clientData = doc.data();
    
    // Auto-update jumlah hit harian (tambah +1)
    await clientRef.update({
      dailyHits: admin.firestore.FieldValue.increment(1),
      lastHitDate: new Date().toISOString()
    });

    // Respons sukses
    res.json({
      status: "Berhasil",
      klien: clientData.namaKlien,
      pesan: "Koneksi ke sistem perbankan & e-wallet berhasil di-bypass (Simulasi Demo)"
    });

  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = app;