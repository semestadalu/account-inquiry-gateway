/**
 * File: api/index.js
 * Deskripsi: Mesin Utama API Gateway + Firebase Auto-Limit
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');

// Inisialisasi Firebase dari Environment Variable Vercel
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Gagal load Firebase Credentials. Pastikan format JSON di env Vercel benar.");
    }
}

const db = admin.apps.length ? admin.firestore() : null;
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const checkApiKey = async (req, res, next) => {
    const apiKey = req.header('X-API-KEY');
    
    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'Unauthorized: X-API-KEY tidak ditemukan' });
    }

    if (!db) {
        return res.status(500).json({ success: false, message: 'Database tidak terhubung' });
    }

    try {
        const clientRef = db.collection('clients').doc(apiKey);
        const doc = await clientRef.get();

        if (!doc.exists) {
            return res.status(401).json({ success: false, message: 'Unauthorized: API Key tidak valid' });
        }

        const data = doc.data();
        const today = new Date().toISOString().split('T')[0];

        if (data.lastHitDate !== today) {
            data.dailyHits = 0;
            data.lastHitDate = today;
        }

        if (data.dailyHits >= 15000) {
            return res.status(429).json({ success: false, message: 'Limit harian API Anda telah habis.' });
        }

        await clientRef.update({
            dailyHits: data.dailyHits + 1,
            lastHitDate: today
        });

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

app.post('/v1/check-account', checkApiKey, async (req, res) => {
    const { bank_code, account_number, type } = req.body;

    if (!bank_code || !account_number || !type) {
        return res.status(400).json({ success: false, message: 'Bad Request: Parameter tidak lengkap' });
    }

    try {
        await new Promise(resolve => setTimeout(resolve, 800));

        return res.status(200).json({
            success: true,
            account_number: account_number,
            account_name: "BUDI SANTOSO", 
            bank_name: bank_code.toUpperCase(),
            type: type.toLowerCase()
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal memproses request' });
    }
});

module.exports = app;