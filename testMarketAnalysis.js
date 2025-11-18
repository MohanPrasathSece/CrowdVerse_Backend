const axios = require('axios');

async function testMarketAnalysis() {
  try {
    // Test market quote with AI insights
    const quoteResponse = await axios.get('http://localhost:5000/api/market/quote?symbol=AAPL');
    console.log('Market Quote with AI Insights:');
    console.log(JSON.stringify(quoteResponse.data, null, 2));
    
    console.log('\n---\n');
    
    // Test market analysis endpoint
    const analysisResponse = await axios.get('http://localhost:5000/api/market/analysis?symbol=AAPL');
    console.log('Market Analysis:');
    console.log(JSON.stringify(analysisResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testMarketAnalysis();
