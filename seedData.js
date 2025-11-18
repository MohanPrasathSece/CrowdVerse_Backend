const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Comment = require('./models/Comment');
const SentimentVote = require('./models/SentimentVote');
const TradeIntentVote = require('./models/TradeIntentVote');
const User = require('./models/User');
const { cryptoAssets } = require('./constants/marketAssets');
require('dotenv').config();

// Mix of global and Indian names for crypto users
const cryptoUsers = [
  { emailOrMobile: 'satoshinakamoto@email.com', password: 'password123', name: 'Satoshi Nakamoto' },
  { emailOrMobile: 'vitalik.buterin@email.com', password: 'password123', name: 'Vitalik Buterin' },
  { emailOrMobile: 'rajesh.crypto@email.com', password: 'password123', name: 'Rajesh Kumar' },
  { emailOrMobile: 'priya.btc@email.com', password: 'password123', name: 'Priya Sharma' },
  { emailOrMobile: 'changpeng.zhao@email.com', password: 'password123', name: 'Changpeng Zhao' },
  { emailOrMobile: 'amit.eth@email.com', password: 'password123', name: 'Amit Patel' },
  { emailOrMobile: 'brian.armstrong@email.com', password: 'password123', name: 'Brian Armstrong' },
  { emailOrMobile: 'sneha.sol@email.com', password: 'password123', name: 'Sneha Reddy' },
  { emailOrMobile: 'sam.bankman@email.com', password: 'password123', name: 'Sam Bankman-Fried' },
  { emailOrMobile: 'vijay.crypto@email.com', password: 'password123', name: 'Vijay Singh' },
  { emailOrMobile: 'michael.saylor@email.com', password: 'password123', name: 'Michael Saylor' },
  { emailOrMobile: 'anita.ada@email.com', password: 'password123', name: 'Anita Gupta' },
  { emailOrMobile: 'charles.hoskinson@email.com', password: 'password123', name: 'Charles Hoskinson' },
  { emailOrMobile: 'rahul.xrp@email.com', password: 'password123', name: 'Rahul Jain' },
  { emailOrMobile: 'kavita.dot@email.com', password: 'password123', name: 'Kavita Nair' }
];

// Realistic crypto comments (mix of English and Hindi)
const cryptoComments = [
  "Bitcoin halving coming soon! Expecting major bull run. #HODL",
  "Ethereum 2.0 staking yields are attractive. Network security improving.",
  "Solana's speed is incredible but network stability concerns remain.",
  "Dogecoin to the moon! 🚀 Elon Musk's support is strong.",
  "Cardano smart contracts gaining traction. Charles Hoskinson's vision working.",
  "Ripple SEC case resolution could trigger massive XRP pump.",
  "Polkadot parachain ecosystem expanding. Interoperability is future.",
  "Avalanche subnet technology is revolutionary for DeFi applications.",
  "Chainlink oracles are backbone of DeFi. Essential infrastructure.",
  "Polygon's zkEVM will boost Ethereum scaling. Gas fees problem solved.",
  "Bitcoin dominance dropping. Altcoin season starting soon!",
  "DeFi protocols on Ethereum showing strong TVL growth.",
  "Layer 2 solutions like Arbitrum and Optimism gaining users.",
  "NFT market recovery happening. Ethereum benefiting from gas fees.",
  "Institutional adoption increasing. Bitcoin ETF approval expected.",
  "Crypto regulations becoming clearer. Market maturing nicely.",
  "Web3 gaming sector exploding. Blockchain gaming is future.",
  "Metaverse tokens pumping. Virtual real estate interesting.",
  "Yield farming strategies evolving. Risk management is key.",
  "Cross-chain bridges improving interoperability between networks.",
  "Stablecoin regulations coming. USDC and USDT market share battle.",
  "Central bank digital currencies (CBDCs) threat to crypto? Discuss.",
  "Lightning Network adoption growing. Bitcoin payments becoming practical.",
  "NFT royalties debate continues. Creator economy at stake.",
  "DAO governance models maturing. Community decision making works.",
  "Crypto mining sustainability concerns. Green Bitcoin mining rising.",
  "DeFi insurance protocols needed. Risk coverage improving.",
  "Tokenization of real world assets starting. Real estate on blockchain.",
  "Gaming guilds and play-to-earn models evolving. Axie Infinity pioneered.",
  "Social media platforms adopting crypto tipping. Content monetization changing."
];

// Crypto assets from marketAssets.js
const cryptoAssetSymbols = cryptoAssets.map(asset => asset.short);

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
    console.log('✅ Connected to MongoDB');

    // Create users if they don't exist
    const users = [];
    for (const userData of cryptoUsers) {
      let user = await User.findOne({ emailOrMobile: userData.emailOrMobile });
      if (!user) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
        
        user = new User(userData);
        await user.save();
        console.log(`👤 Created crypto user: ${userData.name} (${userData.emailOrMobile})`);
      }
      users.push(user);
    }

    // Create sentiment votes for each crypto asset
    for (const asset of cryptoAssetSymbols) {
      const numVotes = Math.floor(Math.random() * 15) + 10; // 10-25 votes per asset
      
      for (let i = 0; i < numVotes; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const sentiment = Math.random() > 0.3 ? 'bullish' : 'bearish'; // 70% bullish bias (crypto is more optimistic)
        
        // Check if user already voted for this asset
        const existingVote = await SentimentVote.findOne({ asset, user: randomUser._id });
        if (!existingVote) {
          const vote = new SentimentVote({
            asset,
            user: randomUser._id,
            sentiment
          });
          await vote.save();
        }
      }
      
      // Create trade intent votes for each crypto asset
      const numIntentVotes = Math.floor(Math.random() * 12) + 8; // 8-20 votes per asset
      
      for (let i = 0; i < numIntentVotes; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const actions = ['buy', 'sell', 'hold'];
        const weights = [0.6, 0.15, 0.25]; // 60% buy, 15% sell, 25% hold (crypto more action-oriented)
        const action = weightedRandom(actions, weights);
        
        // Check if user already voted for this asset
        const existingIntent = await TradeIntentVote.findOne({ asset, user: randomUser._id });
        if (!existingIntent) {
          const intent = new TradeIntentVote({
            asset,
            user: randomUser._id,
            action
          });
          await intent.save();
        }
      }
      
      // Create comments for each crypto asset
      const numComments = Math.floor(Math.random() * 8) + 5; // 5-12 comments per asset
      
      for (let i = 0; i < numComments; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomComment = cryptoComments[Math.floor(Math.random() * cryptoComments.length)];
        
        const comment = new Comment({
          asset,
          user: randomUser._id,
          text: randomComment
        });
        await comment.save();
      }
      
      console.log(`🪙 Seeded data for ${asset}: ${numVotes} sentiment votes, ${numIntentVotes} intent votes, ${numComments} comments`);
    }

    console.log('\n🎉 Crypto dummy data seeding completed successfully!');
    console.log(`📈 Created data for ${cryptoAssetSymbols.length} crypto assets`);
    console.log(`👥 Using ${users.length} global and Indian crypto users`);
    
    // Display summary
    const totalComments = await Comment.countDocuments();
    const totalSentimentVotes = await SentimentVote.countDocuments();
    const totalIntentVotes = await TradeIntentVote.countDocuments();
    
    console.log(`\n📊 Summary:`);
    console.log(`   💬 Total Comments: ${totalComments}`);
    console.log(`   📈 Total Sentiment Votes: ${totalSentimentVotes}`);
    console.log(`   🎯 Total Intent Votes: ${totalIntentVotes}`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Helper function for weighted random selection
function weightedRandom(items, weights) {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

// Run the script
if (require.main === module) {
  seedData();
}

module.exports = seedData;
