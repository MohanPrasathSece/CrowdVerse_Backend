const mongoose = require('mongoose');
const { seedProductionIntelligenceData } = require('../utils/seedProductionData');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('⚠️  MONGODB_URI not set. Skipping MongoDB connection. Auth routes will not work until configured.');
      return;
    }

    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Seed production intelligence data if needed
    try {
      console.log('🌱 Checking production intelligence data seeding...');
      await seedProductionIntelligenceData();
      console.log('✅ Production intelligence data seeding check complete');
    } catch (seedingError) {
      console.error('⚠️  Error during intelligence data seeding:', seedingError.message);
      console.log('⚠️  Intelligence panel may show fallback data until seeding is resolved');
      // Don't exit the process, just log the error and continue
    }
    
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.log('⚠️  Intelligence panel will use fallback data without database connection');
    // Don't exit in production - allow server to run with fallback data
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
