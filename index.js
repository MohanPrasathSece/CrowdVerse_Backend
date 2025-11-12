const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const startMarketSnapshotJob = require('./jobs/marketSnapshotJob');
const startNSEStocksJob = require('./jobs/nseStocksJob');

const app = express();

// Connect to MongoDB (optional until MONGODB_URI is set)
connectDB();

// Middleware
const staticOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://crowd-verse.vercel.app'
];

const envOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...staticOrigins, ...envOrigins])];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const hostname = new URL(origin).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
    if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) {
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'CrowdVerse API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../build');
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
}

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Schedule hourly market snapshots if env configured
startMarketSnapshotJob();
// Schedule hourly NSE NIFTY 50 refresh to DB
startNSEStocksJob();
