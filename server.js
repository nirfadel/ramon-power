const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ─── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROUTES ────────────────────────────────────────────────────
app.use('/api/reports', require('./routes/reports'));

// כל שאר הנתיבים → ה-SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── DB + START ────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ramon_power';
const PORT      = process.env.PORT      || 3000;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(`✅ MongoDB מחובר: ${MONGO_URI}`);
    app.listen(PORT, () => console.log(`⚡ שרת רץ על פורט ${PORT}`));
  })
  .catch(err => {
    console.error('❌ שגיאת חיבור MongoDB:', err.message);
    process.exit(1);
  });
