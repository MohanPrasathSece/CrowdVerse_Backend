const mongoose = require('mongoose');
const { hourlyAIJob, initializeAIAnalysis } = require('./jobs/aiAnalysisScheduler');
require('dotenv').config();

async function startScheduler() {
  try {
    console.log('🚀 [STARTUP] Starting AI Analysis Scheduler...');
    
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ [STARTUP] MongoDB connected');
    
    // Initialize AI analysis for some assets immediately
    await initializeAIAnalysis();
    
    // Start the hourly job
    hourlyAIJob.start();
    console.log('✅ [STARTUP] Hourly AI analysis job started');
    
    console.log('🎯 [STARTUP] AI Analysis Scheduler is running');
    console.log('📅 [STARTUP] Schedule: Every hour at minute 0');
    console.log('🔄 [STARTUP] Each asset will be analyzed once every 24 hours');
    console.log('💾 [STARTUP] Analysis data is cached for 12 hours');
    
  } catch (error) {
    console.error('❌ [STARTUP] Failed to start scheduler:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 [STARTUP] Shutting down scheduler...');
  hourlyAIJob.stop();
  await mongoose.connection.close();
  console.log('✅ [STARTUP] Scheduler stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [STARTUP] Shutting down scheduler...');
  hourlyAIJob.stop();
  await mongoose.connection.close();
  console.log('✅ [STARTUP] Scheduler stopped gracefully');
  process.exit(0);
});

// Start the scheduler
startScheduler();
