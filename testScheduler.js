const mongoose = require('mongoose');
const { getAIAnalysisData, AI_ANALYSIS_CACHE } = require('./jobs/aiAnalysisScheduler');
require('dotenv').config();

async function testScheduler() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test cache retrieval
    console.log('\n📊 Testing scheduler cache...');
    console.log('Cache size:', AI_ANALYSIS_CACHE.size);
    
    // List all cached assets
    console.log('\n📋 Cached assets:');
    for (const [key, value] of AI_ANALYSIS_CACHE.entries()) {
      console.log(`- ${key}: Generated at ${value.generated_at}, Expires at ${value.expires_at}`);
      console.log(`  Provider: ${value.analysis_provider}`);
      console.log(`  Final Summary: ${value.final_summary?.substring(0, 100)}...`);
      console.log('');
    }
    
    // Test retrieval for specific asset
    const testData = getAIAnalysisData('BTC');
    if (testData) {
      console.log('✅ Successfully retrieved BTC data from scheduler cache');
      console.log('Provider:', testData.analysis_provider);
      console.log('Generated at:', testData.generated_at);
    } else {
      console.log('⚠️ No BTC data found in scheduler cache');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testScheduler();
