const mongoose = require('mongoose');
const Stock = require('./models/Stock');
const Comment = require('./models/Comment');
const SentimentVote = require('./models/SentimentVote');
const TradeIntentVote = require('./models/TradeIntentVote');
const User = require('./models/User');
require('dotenv').config();

// Sample stock data
const stockData = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', price: 2850.75, open: 2820, high: 2890, low: 2810, prevClose: 2805, change: 1.62, marketCap: 1900000000000, weightage: 10.2 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology', price: 3525.80, open: 3500, high: 3550, low: 3480, prevClose: 3490, change: 1.02, marketCap: 1280000000000, weightage: 8.8 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', price: 1650.25, open: 1640, high: 1670, low: 1630, prevClose: 1635, change: 0.93, marketCap: 980000000000, weightage: 7.5 },
  { symbol: 'INFY', name: 'Infosys Ltd', sector: 'Technology', price: 1520.60, open: 1510, high: 1535, low: 1500, prevClose: 1505, change: 1.04, marketCap: 650000000000, weightage: 6.2 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', price: 2780.90, open: 2760, high: 2800, low: 2745, prevClose: 2750, change: 1.12, marketCap: 620000000000, weightage: 5.8 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', price: 890.45, open: 885, high: 905, low: 880, prevClose: 878, change: 1.42, marketCap: 590000000000, weightage: 5.5 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', price: 580.30, open: 575, high: 590, low: 570, prevClose: 572, change: 1.45, marketCap: 520000000000, weightage: 5.2 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', price: 1950.80, open: 1940, high: 1970, low: 1925, prevClose: 1930, change: 1.09, marketCap: 480000000000, weightage: 4.8 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Financial Services', price: 7250.60, open: 7200, high: 7350, low: 7150, prevClose: 7180, change: 0.98, marketCap: 450000000000, weightage: 4.5 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', price: 950.25, open: 945, high: 965, low: 935, prevClose: 940, change: 1.09, marketCap: 420000000000, weightage: 4.2 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'Technology', price: 420.80, open: 415, high: 430, low: 410, prevClose: 412, change: 2.14, marketCap: 380000000000, weightage: 3.8 },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', price: 780.45, open: 775, high: 795, low: 770, prevClose: 772, change: 1.05, marketCap: 350000000000, weightage: 3.5 },
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', price: 350.20, open: 345, high: 355, low: 340, prevClose: 342, change: 2.40, marketCap: 320000000000, weightage: 3.2 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Paints', price: 3250.75, open: 3220, high: 3280, low: 3200, prevClose: 3210, change: 1.27, marketCap: 300000000000, weightage: 3.0 },
  { symbol: 'DMART', name: 'Avenue Supermarts Ltd', sector: 'Retail', price: 3850.90, open: 3800, high: 3900, low: 3750, prevClose: 3780, change: 1.87, marketCap: 280000000000, weightage: 2.8 }
];

// Sample comments
const sampleComments = [
  "Strong quarterly results expected. Management is confident about growth prospects.",
  "Technical indicators suggest bullish momentum. RSI is showing positive divergence.",
  "Market volatility might impact short term, but long term fundamentals remain strong.",
  "Sector outlook looks positive. Company well positioned to benefit from economic recovery.",
  "Valuation seems reasonable given growth prospects. Good entry point for long term investors.",
  "Recent corporate actions indicate management confidence. Dividend yield is attractive.",
  "Competition is increasing but company maintains market leadership. Brand value is strong.",
  "Global expansion plans could drive next phase of growth. International revenue growing.",
  "Cost optimization measures improving margins. Operational efficiency is notable.",
  "Regulatory environment favorable. Policy changes could benefit the sector.",
  "Digital transformation initiatives showing results. Technology adoption is accelerating.",
  "Supply chain improvements reducing costs. Inventory management is efficient.",
  "Merger and acquisition activity in sector could create opportunities. Consolidation likely.",
  "Consumer demand trends are favorable. Market share gains continue.",
  "Investor sentiment is positive. Institutional ownership increasing."
];

// Sample users (we'll create these if they don't exist)
const sampleUsers = [
  { emailOrMobile: 'trader1@example.com', password: 'password123' },
  { emailOrMobile: 'investor2@example.com', password: 'password123' },
  { emailOrMobile: 'analyst3@example.com', password: 'password123' },
  { emailOrMobile: 'expert4@example.com', password: 'password123' },
  { emailOrMobile: 'mentor5@example.com', password: 'password123' }
];

async function createDummyData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
    console.log('Connected to MongoDB');

    // Create users if they don't exist
    const users = [];
    for (const userData of sampleUsers) {
      let user = await User.findOne({ emailOrMobile: userData.emailOrMobile });
      if (!user) {
        user = new User(userData);
        await user.save();
        console.log(`Created user: ${userData.emailOrMobile}`);
      }
      users.push(user);
    }

    // Create/update stocks
    const stocks = [];
    for (const stockInfo of stockData) {
      let stock = await Stock.findOne({ symbol: stockInfo.symbol });
      if (!stock) {
        stock = new Stock(stockInfo);
        await stock.save();
        console.log(`Created stock: ${stockInfo.symbol}`);
      } else {
        // Update existing stock with new data
        Object.assign(stock, stockInfo);
        await stock.save();
        console.log(`Updated stock: ${stockInfo.symbol}`);
      }
      stocks.push(stock);
    }

    // Clear existing comments, sentiment votes, and trade intent votes
    await Comment.deleteMany({});
    await SentimentVote.deleteMany({});
    await TradeIntentVote.deleteMany({});
    console.log('Cleared existing comments and votes');

    // Create comments for each stock
    for (const stock of stocks) {
      const numComments = Math.floor(Math.random() * 8) + 5; // 5-12 comments per stock
      
      for (let i = 0; i < numComments; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
        
        const comment = new Comment({
          asset: stock.symbol,
          user: randomUser._id,
          text: randomComment
        });
        await comment.save();
      }
      console.log(`Created ${numComments} comments for ${stock.symbol}`);
    }

    // Create sentiment votes for each stock
    for (const stock of stocks) {
      const numVotes = Math.floor(Math.random() * 20) + 15; // 15-35 votes per stock
      
      for (let i = 0; i < numVotes; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const sentiments = ['bullish', 'bearish'];
        const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        
        // Check if user already voted for this stock
        const existingVote = await SentimentVote.findOne({ 
          asset: stock.symbol, 
          user: randomUser._id 
        });
        
        if (!existingVote) {
          const vote = new SentimentVote({
            asset: stock.symbol,
            user: randomUser._id,
            sentiment: randomSentiment
          });
          await vote.save();
        }
      }
      console.log(`Created sentiment votes for ${stock.symbol}`);
    }

    // Create trade intent votes for each stock
    for (const stock of stocks) {
      const numVotes = Math.floor(Math.random() * 20) + 15; // 15-35 votes per stock
      
      for (let i = 0; i < numVotes; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const actions = ['buy', 'sell', 'hold'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        // Check if user already voted for this stock
        const existingVote = await TradeIntentVote.findOne({ 
          asset: stock.symbol, 
          user: randomUser._id 
        });
        
        if (!existingVote) {
          const vote = new TradeIntentVote({
            asset: stock.symbol,
            user: randomUser._id,
            action: randomAction
          });
          await vote.save();
        }
      }
      console.log(`Created trade intent votes for ${stock.symbol}`);
    }

    console.log('\n✅ Dummy data created successfully!');
    console.log(`📈 Created/updated ${stocks.length} stocks`);
    console.log(`💬 Created comments for all stocks`);
    console.log(`📊 Created sentiment votes for all stocks`);
    console.log(`💰 Created trade intent votes for all stocks`);
    console.log(`👥 Created ${users.length} users`);

  } catch (error) {
    console.error('Error creating dummy data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createDummyData();
}

module.exports = createDummyData;
