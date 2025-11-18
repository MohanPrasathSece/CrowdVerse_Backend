# Crypto Dummy Data Seeding for CrowdVerse

This document explains how to populate the CrowdVerse database with realistic crypto dummy data for demonstration purposes.

## Purpose

The dummy data provides:
- **Global and Indian crypto users** with authentic names
- **Realistic crypto comments** including market analysis and Hindi text
- **Natural voting patterns** for crypto sentiment and intent polls
- **Diverse engagement** across major cryptocurrencies

## Users Created

15 dummy users with mix of global crypto leaders and Indian crypto enthusiasts:

### Global Crypto Leaders:
- **Satoshi Nakamoto** - Bitcoin creator
- **Vitalik Buterin** - Ethereum founder  
- **Changpeng Zhao** - Binance CEO
- **Brian Armstrong** - Coinbase CEO
- **Sam Bankman-Fried** - FTX founder
- **Michael Saylor** - MicroStrategy Bitcoin advocate
- **Charles Hoskinson** - Cardano founder

### Indian Crypto Enthusiasts:
- **Rajesh Kumar** (rajesh.crypto@email.com)
- **Priya Sharma** (priya.btc@email.com)
- **Amit Patel** (amit.eth@email.com)
- **Sneha Reddy** (sneha.sol@email.com)
- **Vijay Singh** (vijay.crypto@email.com)
- **Anita Gupta** (anita.ada@email.com)
- **Rahul Jain** (rahul.xrp@email.com)
- **Kavita Nair** (kavita.dot@email.com)

Each user has:
- **Email**: `{name}@email.com` or `{crypto}.{name}@email.com`
- **Password**: `password123` for all testing accounts

## Crypto Assets Seeded

Data created for 10 major cryptocurrencies:
- **BTC** - Bitcoin
- **ETH** - Ethereum
- **SOL** - Solana
- **DOGE** - Dogecoin
- **ADA** - Cardano
- **XRP** - Ripple
- **DOT** - Polkadot
- **AVAX** - Avalanche
- **LINK** - Chainlink
- **MATIC** - Polygon

## Data Generated Per Asset

### Comments (5-12 per crypto)
- **Total**: 309 comments
- **Content**: Realistic crypto market analysis, technical insights, Hindi commentary
- **Topics**: Bitcoin halving, Ethereum 2.0, DeFi, NFTs, regulations, institutional adoption
- **Distribution**: Randomly assigned to different users

### Sentiment Votes (10-25 per crypto)
- **Total**: 279 sentiment votes  
- **Distribution**: 70% bullish, 30% bearish (crypto optimism bias)
- **Rule**: 1 vote per user per crypto

### Intent Votes (8-20 per crypto)
- **Total**: 248 intent votes
- **Distribution**: 60% buy, 15% sell, 25% hold (crypto action-oriented)
- **Rule**: 1 vote per user per crypto

## How to Use

### Quick Start
```bash
cd server
npm run seed
```

### What It Does
1. **Connects** to your MongoDB database
2. **Creates** 15 crypto users (global + Indian) if they don't exist
3. **Generates** realistic crypto comments and votes for all major cryptos
4. **Preserves** existing real user data
5. **Provides** summary statistics

### Important Notes
- **Safe to run multiple times** - Won't create duplicates
- **Preserves real data** - Only adds dummy crypto content
- **Uses realistic patterns** - Mimics actual crypto community behavior
- **Includes Hindi commentary** - Authentic Indian crypto community voice

## Resetting Data

If you want to completely reset and reseed:
```bash
# Clear all dummy data (keep real users)
node -e "
const mongoose = require('mongoose');
const Comment = require('./models/Comment');
const SentimentVote = require('./models/SentimentVote');
const TradeIntentVote = require('./models/TradeIntentVote');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await Comment.deleteMany({});
  await SentimentVote.deleteMany({});
  await TradeIntentVote.deleteMany({});
  console.log('✅ All crypto dummy data cleared');
  process.exit(0);
});
"

# Then reseed
npm run seed
```

## Customization

### Adding More Crypto Users
Edit `seedData.js` and add to the `cryptoUsers` array:
```javascript
{ emailOrMobile: 'new.user@email.com', password: 'password123', name: 'New User' }
```

### Adding More Crypto Comments
Edit the `cryptoComments` array to include your own crypto commentary.

### Changing Vote Distribution
Modify the weights in the `seedData.js`:
```javascript
// For sentiment votes (more bullish for crypto)
const sentiment = Math.random() > 0.3 ? 'bullish' : 'bearish'; // Adjust 0.3

// For intent votes (more action-oriented for crypto)  
const weights = [0.6, 0.15, 0.25]; // [buy, sell, hold]
```

### Adding New Crypto Assets
Add new assets to `constants/marketAssets.js` in the `cryptoAssets` array.

## Statistics

After seeding, you'll see:
- **309 total comments** across all crypto assets
- **279 sentiment votes** (bullish/bearish)
- **248 intent votes** (buy/sell/hold)
- **15 crypto users** (global + Indian) ready for testing

This provides a rich, realistic crypto dataset for:
- **Testing the crypto UI** with populated data
- **Demonstrating crypto features** to stakeholders
- **Performance testing** with realistic crypto load
- **User experience testing** with varied crypto engagement

## Security Note

All dummy users use the same password (`password123`) for easy testing. **Never use this in production!**

## Global + Indian Focus

This seed script specifically creates:
- **Global crypto thought leaders** for authenticity
- **Indian crypto community members** for local relevance
- **Mixed language comments** (English + Hindi) for realistic engagement
- **Crypto-specific content** relevant to the Indian market context
