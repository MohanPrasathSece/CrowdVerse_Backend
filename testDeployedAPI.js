const axios = require('axios');

async function testDeployedAPI() {
  console.log('🔍 Testing deployed API endpoints...');
  
  // Test the intelligence endpoint
  try {
    console.log('\n📊 Testing /api/ai-summary/intelligence/HDFCBANK...');
    const response = await axios.get('http://localhost:5000/api/ai-summary/intelligence/HDFCBANK');
    console.log('✅ Intelligence API Response:');
    console.log('Global News Summary:', response.data.global_news_summary.substring(0, 100) + '...');
    console.log('Data Points:', response.data.data_points ? 'Present' : 'Missing');
    console.log('Analysis Provider:', response.data.analysis_provider || 'Not specified');
    
    // Check if it's the fallback data
    if (response.data.global_news_summary.includes('No major news headlines')) {
      console.log('⚠️  This is fallback data - database seeding may not be working');
    }
    
  } catch (error) {
    console.error('❌ Intelligence API Error:', error.response?.data || error.message);
  }
  
  // Test the summary endpoint for comparison
  try {
    console.log('\n📊 Testing /api/ai-summary/summary/HDFCBANK...');
    const response = await axios.get('http://localhost:5000/api/ai-summary/summary/HDFCBANK');
    console.log('✅ Summary API Response:');
    console.log('Global News Summary:', response.data.global_news_summary.substring(0, 100) + '...');
    
    if (response.data.global_news_summary.includes('AI provider not configured')) {
      console.log('⚠️  This is the AI provider not configured message');
    }
    
  } catch (error) {
    console.error('❌ Summary API Error:', error.response?.data || error.message);
  }
  
  // Check database connection status
  try {
    console.log('\n🔗 Testing database connection...');
    const mongoose = require('mongoose');
    const Intelligence = require('./models/Intelligence');
    require('dotenv').config();
    
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Intelligence.countDocuments();
    console.log(`✅ Database connected. Found ${count} intelligence records`);
    
    if (count > 0) {
      const sample = await Intelligence.findOne({ asset: 'HDFCBANK' });
      if (sample) {
        console.log('✅ Found HDFCBANK data in database');
        console.log('News Summary:', sample.global_news_summary.substring(0, 100) + '...');
      } else {
        console.log('⚠️  HDFCBANK data not found in database');
      }
    } else {
      console.log('⚠️  No intelligence data in database - seeding may be needed');
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
}

testDeployedAPI();
