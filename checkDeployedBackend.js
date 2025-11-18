const axios = require('axios');

async function checkDeployedBackend() {
  console.log('🔍 Checking deployed backend status...');
  
  // Test multiple assets to see if any work
  const assets = ['BTC', 'HDFCBANK', 'RELIANCE', 'ETH'];
  
  for (const asset of assets) {
    try {
      console.log(`\n📊 Testing ${asset}...`);
      const response = await axios.get(`http://localhost:5000/api/ai-summary/intelligence/${asset}`);
      
      console.log(`✅ ${asset} Response:`);
      console.log('  Global News:', response.data.global_news_summary.substring(0, 50) + '...');
      console.log('  Data Points:', response.data.data_points ? 'Present' : 'Missing');
      console.log('  Provider:', response.data.analysis_provider || 'Not specified');
      
      // Check if it's fallback data
      if (response.data.global_news_summary.includes('No major news headlines')) {
        console.log(`⚠️  ${asset} is using fallback data`);
      } else if (response.data.global_news_summary.includes('AI provider not configured')) {
        console.log(`❌ ${asset} is hitting wrong endpoint (summary instead of intelligence)`);
      } else {
        console.log(`✅ ${asset} has proper intelligence data`);
      }
      
    } catch (error) {
      console.error(`❌ ${asset} Error:`, error.response?.status, error.response?.data || error.message);
    }
  }
  
  // Check if the intelligence route exists
  try {
    console.log('\n🔍 Checking if intelligence route exists...');
    const response = await axios.get('http://localhost:5000/api/ai-summary/intelligence/BTC');
    console.log('✅ Intelligence route exists and responds');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Intelligence route not found (404) - backend needs redeployment');
    } else {
      console.log('❌ Intelligence route error:', error.response?.status);
    }
  }
}

checkDeployedBackend();
