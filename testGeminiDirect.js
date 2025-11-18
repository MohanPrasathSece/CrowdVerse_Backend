require('dotenv').config();
const geminiService = require('./services/geminiService');

async function testGemini() {
  console.log('Testing Gemini service...');
  
  // Check if available
  const available = await geminiService.isAvailable();
  console.log('Gemini available:', available);
  
  if (available) {
    try {
      // Test a simple analysis
      const assetData = {
        assetSymbol: 'BTC',
        assetName: 'Bitcoin',
        userComments: ['BTC is going to the moon!', 'I think BTC will crash soon'],
        sentimentVotes: { bullish: 10, bearish: 5 },
        tradeVotes: { buy: 8, sell: 3, hold: 4 }
      };
      
      const result = await geminiService.generateIntelligenceAnalysis(assetData);
      console.log('Analysis result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

testGemini().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
