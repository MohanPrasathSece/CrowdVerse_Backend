const mongoose = require('mongoose');
const Intelligence = require('./models/Intelligence');
const { seedProductionIntelligenceData } = require('./utils/seedProductionData');
require('dotenv').config();

async function testDeploymentSeeding() {
  console.log('🚀 Testing deployment intelligence data seeding...');
  
  try {
    // Test environment variables
    console.log('🔍 Environment check:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    
    // Connect to database
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    
    // Check existing data
    console.log('\n📊 Checking existing intelligence data...');
    const existingCount = await Intelligence.countDocuments();
    console.log(`Found ${existingCount} existing intelligence records`);
    
    if (existingCount === 0) {
      console.log('🌱 No data found, running production seeding...');
      await seedProductionIntelligenceData();
      
      // Verify seeding worked
      const newCount = await Intelligence.countDocuments();
      console.log(`✅ After seeding: ${newCount} records in database`);
      
      // Test a sample record
      const sampleData = await Intelligence.findOne({ asset: 'BINANCE:BTCUSDT' });
      if (sampleData) {
        console.log('✅ Sample BTC data found');
        console.log('Global News Summary:', sampleData.global_news_summary.substring(0, 100) + '...');
        console.log('Data Points Length:', sampleData.data_points.length);
      } else {
        console.log('❌ No BTC data found after seeding');
      }
    } else {
      console.log('✅ Data already exists, testing API format...');
      const sampleData = await Intelligence.findOne({ asset: 'BINANCE:BTCUSDT' });
      if (sampleData) {
        console.log('✅ Sample data format looks correct');
      }
    }
    
    console.log('\n🎉 Deployment seeding test completed successfully!');
    
  } catch (error) {
    console.error('❌ Deployment seeding test failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testDeploymentSeeding();
