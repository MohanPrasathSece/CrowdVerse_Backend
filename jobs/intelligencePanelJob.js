const cron = require('node-cron');
const mongoose = require('mongoose');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const Comment = require('../models/Comment');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');
const axios = require('axios');
require('dotenv').config();

// Cache for intelligence panel data (24h TTL)
const INTELLIGENCE_CACHE = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

// Generate AI summary for an asset
const generateAssetSummary = async (assetName, recentComments = []) => {
  try {
    const payload = {
      asset_name: assetName,
      recent_comments: recentComments,
      recent_news: [],
      market_sentiment: ''
    };

    const response = await axios.post(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/ai-summary`, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error generating summary for ${assetName}:`, error.message);
    return null;
  }
};

// Analyze data and create summary without AI
const analyzeAssetData = async (assetSymbol) => {
  try {
    // Get recent comments
    const recentComments = await Comment.find({ asset: assetSymbol })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'emailOrMobile')
      .lean();

    // Get sentiment votes
    const sentimentVotes = await SentimentVote.find({ asset: assetSymbol })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get trade intent votes
    const tradeVotes = await TradeIntentVote.find({ asset: assetSymbol })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate sentiment distribution
    const bullishCount = sentimentVotes.filter(v => v.sentiment === 'bullish').length;
    const bearishCount = sentimentVotes.filter(v => v.sentiment === 'bearish').length;
    const totalSentiment = bullishCount + bearishCount;
    const bullishPercent = totalSentiment > 0 ? (bullishCount / totalSentiment * 100).toFixed(1) : 50;

    // Calculate trade intent distribution
    const buyCount = tradeVotes.filter(v => v.action === 'buy').length;
    const sellCount = tradeVotes.filter(v => v.action === 'sell').length;
    const holdCount = tradeVotes.filter(v => v.action === 'hold').length;
    const totalTrade = buyCount + sellCount + holdCount;
    const buyPercent = totalTrade > 0 ? (buyCount / totalTrade * 100).toFixed(1) : 33.3;
    const sellPercent = totalTrade > 0 ? (sellCount / totalTrade * 100).toFixed(1) : 33.3;
    const holdPercent = totalTrade > 0 ? (holdCount / totalTrade * 100).toFixed(1) : 33.4;

    // Create comment summaries
    const commentTexts = recentComments.map(c => c.text).join(' ');
    const commentSummary = recentComments.length > 0 
      ? `Recent community activity shows ${recentComments.length} comments. Users are discussing various aspects of ${assetSymbol}.`
      : `No recent community comments for ${assetSymbol}.`;

    // Create market sentiment summary
    const sentimentSummary = totalSentiment > 0
      ? `Market sentiment for ${assetSymbol} shows ${bullishPercent}% bullish vs ${100-bullishPercent}% bearish sentiment based on ${totalSentiment} votes.`
      : `No sentiment data available for ${assetSymbol}.`;

    // Create trade intent summary
    const tradeSummary = totalTrade > 0
      ? `Trade intent shows ${buyPercent}% buyers, ${sellPercent}% sellers, and ${holdPercent}% holders based on ${totalTrade} votes.`
      : `No trade intent data available for ${assetSymbol}.`;

    // Create global news summary (placeholder)
    const newsSummary = `No major news headlines specifically affecting ${assetSymbol} in the last 24 hours.`;

    // Create final AI takeaway
    const finalTakeaway = `${assetSymbol} shows mixed signals with ${bullishPercent}% bullish sentiment. Recent community engagement ${recentComments.length > 0 ? 'is active' : 'is low'}. Consider monitoring sentiment trends and trade patterns.`;

    return {
      global_news_summary: newsSummary,
      user_comments_summary: commentSummary,
      market_sentiment_summary: sentimentSummary,
      final_summary: finalTakeaway,
      generated_at: new Date().toISOString(),
      data_points: {
        comments_count: recentComments.length,
        sentiment_votes: totalSentiment,
        trade_votes: totalTrade,
        bullish_percent: parseFloat(bullishPercent),
        buy_percent: parseFloat(buyPercent)
      }
    };
  } catch (error) {
    console.error(`Error analyzing data for ${assetSymbol}:`, error.message);
    return null;
  }
};

// Daily job to pre-calculate intelligence panel data
const intelligencePanelJob = cron.schedule('0 3 * * *', async () => { // Run daily at 3 AM
  console.log('🔄 Starting daily intelligence panel data generation...');
  
  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
    }

    // Get all assets (crypto + stocks)
    const allAssets = [
      ...cryptoAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'crypto' })),
      ...stockAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'stock' }))
    ];

    console.log(`Processing ${allAssets.length} assets...`);

    for (const asset of allAssets) {
      try {
        // Analyze data and create summary
        const summary = await analyzeAssetData(asset.symbol);
        
        if (summary) {
          // Cache the summary
          INTELLIGENCE_CACHE.set(asset.symbol.toUpperCase(), {
            at: Date.now(),
            data: summary
          });
          
          console.log(`✅ Generated intelligence for ${asset.symbol} (${asset.type})`);
        } else {
          console.log(`⚠️ Failed to generate intelligence for ${asset.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${asset.symbol}:`, error.message);
      }
    }
    
    console.log(`✅ Intelligence panel data generated for ${INTELLIGENCE_CACHE.size} assets`);
    
  } catch (error) {
    console.error('❌ Error in intelligence panel job:', error.message);
  } finally {
    console.log('🏁 Intelligence panel job completed');
  }
}, {
  scheduled: false // Don't start automatically
});

// Get cached intelligence data
const getIntelligenceData = (assetSymbol) => {
  const key = String(assetSymbol || '').toUpperCase();
  const cached = INTELLIGENCE_CACHE.get(key);
  
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.data;
  }
  
  return null;
};

// Manual trigger for testing
const runIntelligencePanelJob = async () => {
  console.log('🚀 Manually running intelligence panel job...');
  
  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
    }

    // Get all assets (crypto + stocks)
    const allAssets = [
      ...cryptoAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'crypto' })),
      ...stockAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'stock' }))
    ];

    console.log(`Processing ${allAssets.length} assets...`);

    for (const asset of allAssets) {
      try {
        // Analyze data and create summary
        const summary = await analyzeAssetData(asset.symbol);
        
        if (summary) {
          // Cache the summary
          INTELLIGENCE_CACHE.set(asset.symbol.toUpperCase(), {
            at: Date.now(),
            data: summary
          });
          
          console.log(`✅ Generated intelligence for ${asset.symbol} (${asset.type})`);
        } else {
          console.log(`⚠️ Failed to generate intelligence for ${asset.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${asset.symbol}:`, error.message);
      }
    }
    
    console.log(`✅ Intelligence panel data generated for ${INTELLIGENCE_CACHE.size} assets`);
    
  } catch (error) {
    console.error('❌ Error in intelligence panel job:', error.message);
  } finally {
    console.log('🏁 Intelligence panel job completed');
  }
};

module.exports = {
  intelligencePanelJob,
  runIntelligencePanelJob,
  getIntelligenceData,
  INTELLIGENCE_CACHE
};
