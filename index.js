const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Check critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not defined in environment variables.');
  console.error('   Auth routes will fail. Please set JWT_SECRET.');
}
if (!process.env.MONGODB_URI) {
  console.warn('⚠️  WARNING: MONGODB_URI is not defined. Database connection will be skipped.');
}

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const adminRoutes = require('./routes/admin');
const User = require('./models/User');
const startMarketSnapshotJob = require('./jobs/marketSnapshotJob');
const startNSEStocksJob = require('./jobs/nseStocksJob');
const startAISummariesJob = require('./jobs/aiSummariesJob');
const { intelligencePanelJob, runIntelligencePanelJob, INTELLIGENCE_CACHE } = require('./jobs/intelligencePanelJobGemini');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB (optional until MONGODB_URI is set)
connectDB();

// Middleware
const staticOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://crowd-verse.vercel.app',
  'https://www.crowdverse.in',
  'https://crowdverse-backend.onrender.com'
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
    if (hostname === 'crowdverse.in' || hostname === 'www.crowdverse.in') {
      return true;
    }
    if (hostname === 'render.com' || hostname.endsWith('.render.com')) {
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

// Log AI provider status for visibility
if (process.env.HUGGINGFACE_API_KEY) {
  console.log(`🧠 AI Provider: Hugging Face (${process.env.HUGGINGFACE_MODEL || 'google/flan-t5-base'})`);
} else if (process.env.OPENAI_API_KEY) {
  console.log('🧠 AI Provider: OpenAI');
} else {
  console.warn('🧠 AI Provider: none configured');
}

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'CrowdVerse API' });
});

// Detailed health check for Render
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assets', require('./routes/asset'));
app.use('/api/ai-summary', require('./routes/aiSummary'));
app.use('/api/news', require('./routes/news'));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../build');
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
}

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.on('join_asset', (asset) => {
    if (typeof asset === 'string' && asset.trim()) {
      socket.join(String(asset).toUpperCase());
    }
  });
  socket.on('leave_asset', (asset) => {
    if (typeof asset === 'string' && asset.trim()) {
      socket.leave(String(asset).toUpperCase());
    }
  });
});

app.set('io', io);

// Initialize AI Analysis Scheduler
const { initializeAIAnalysis, hourlyAIJob, dailyAIJob } = require('./jobs/aiAnalysisScheduler');

// Start the scheduler in the background
initializeAIAnalysis().catch(err => {
  console.error('⚠️ Failed to initialize AI analysis scheduler:', err.message);
});

// Start hourly AI analysis job
hourlyAIJob.start();

// Start daily AI analysis job at 9:00 AM
dailyAIJob.start();
console.log('🤖 AI Analysis Scheduler initialized - Daily job at 9:00 AM, Hourly job every hour');

const ensureAdminUser = async () => {
  try {
    const adminIdentifier = process.env.ADMIN_EMAIL || 'admin@crowdverse.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let admin = await User.findOne({ emailOrMobile: adminIdentifier });
    if (!admin) {
      admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        emailOrMobile: adminIdentifier,
        password: adminPassword,
        isAdmin: true,
      });
      await admin.save();
      console.log('👤 Admin user created with email:', adminIdentifier);
    } else if (!admin.isAdmin) {
      admin.isAdmin = true;
      await admin.save();
      console.log('👤 Existing user promoted to admin:', adminIdentifier);
    }
  } catch (err) {
    console.error('Failed to ensure admin user exists:', err.message);
  }
};

ensureAdminUser();

const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🤖 AI Analysis Scheduler initialized and running hourly');
});

// Schedule hourly market snapshots if env configured
startMarketSnapshotJob();
// Schedule hourly NSE NIFTY 50 refresh to DB
startNSEStocksJob();
// Schedule daily AI summaries warm-up (configurable via env)
startAISummariesJob();
// Schedule daily intelligence panel data generation at 3 AM
intelligencePanelJob.start();

// Manual trigger endpoint for intelligence job
app.post('/api/intelligence/trigger', async (req, res) => {
  try {
    console.log('🤖 [API] Manual trigger for intelligence panel job...');
    await runIntelligencePanelJob();
    res.json({
      success: true,
      message: 'Intelligence panel job triggered successfully',
      cacheSize: INTELLIGENCE_CACHE.size
    });
  } catch (error) {
    console.error('❌ [API] Error triggering intelligence job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check cache contents
app.get('/api/intelligence/cache', (req, res) => {
  const cacheContents = {};
  for (const [key, value] of INTELLIGENCE_CACHE.entries()) {
    cacheContents[key] = {
      cached_at: new Date(value.at).toISOString(),
      provider: value.data.analysis_provider || 'unknown',
      has_news: !!value.data.global_news_summary,
      has_comments: !!value.data.user_comments_summary,
      has_sentiment: !!value.data.market_sentiment_summary,
      has_final: !!value.data.final_summary,
      generated_at: value.data.generated_at
    };
  }
  res.json({
    cache_size: INTELLIGENCE_CACHE.size,
    cache_contents: cacheContents
  });
});
