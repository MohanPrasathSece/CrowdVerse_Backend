const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const startMarketSnapshotJob = require('./jobs/marketSnapshotJob');

const app = express();

// Connect to MongoDB (optional until MONGODB_URI is set)
connectDB();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://crowd-verse.vercel.app'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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
