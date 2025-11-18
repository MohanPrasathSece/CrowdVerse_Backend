const axios = require('axios');

async function testCommentSentiment() {
  try {
    const response = await axios.post('http://localhost:5000/api/assets/BTC/comments', {
      content: 'BTC is looking bullish today, might break resistance!'
    });
    
    console.log('Comment created with sentiment analysis:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCommentSentiment();
