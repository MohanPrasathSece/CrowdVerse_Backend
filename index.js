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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/assets', require('./routes/asset'));
app.use('/api/ai-summary', require('./routes/aiSummary'));

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
  const { initializeAIAnalysis, hourlyAIJob } = require('./jobs/aiAnalysisScheduler');
  
  // Start the scheduler in the background
  initializeAIAnalysis().catch(err => {
    console.error('⚠️ Failed to initialize AI analysis scheduler:', err.message);
  });
  
  // Start hourly AI analysis job
  hourlyAIJob.start();

  const PORT = process.env.SERVER_PORT || 5000;
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
