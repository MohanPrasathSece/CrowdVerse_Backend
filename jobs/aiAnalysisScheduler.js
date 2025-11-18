const cron = require('node-cron');
const mongoose = require('mongoose');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const Comment = require('../models/Comment');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');
const geminiService = require('../services/geminiService');
require('dotenv').config();

// Cache for AI analysis data (12h TTL)
const AI_ANALYSIS_CACHE = new Map();
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Get all assets in a specific order for hourly generation
const getAllAssets = () => {
  return [
    ...cryptoAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'crypto', short: asset.short })),
    ...stockAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'stock', short: asset.short }))
  ];
};

// Analyze asset data for AI
const analyzeAssetForAI = async (asset) => {
  try {
    console.log(`🤖 [AI_SCHEDULER] Starting analysis for ${asset.symbol} (${asset.type})`);
    
    // Get recent comments
    const recentComments = await Comment.find({
      assetSymbol: asset.short.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    // Get sentiment votes
    const sentimentVotes = await SentimentVote.find({
      assetSymbol: asset.short.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    // Get trade intent votes
    const tradeVotes = await TradeIntentVote.find({
      assetSymbol: asset.short.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
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

    // Prepare data for Gemini
    const assetData = {
      assetSymbol: asset.short,
      assetName: asset.name,
      recentNews: [], // Can be enhanced with news API
      userComments: recentComments.map(c => c.text).join('\n'),
      sentimentData: {
        bullishPercent: parseFloat(bullishPercent),
        bearishPercent: parseFloat((100 - bullishPercent).toFixed(1)),
        totalSentimentVotes: totalSentiment,
        recentComments: recentComments.length
      },
      marketData: {
        buyPercent: parseFloat(buyPercent),
        sellPercent: totalTrade > 0 ? parseFloat((sellCount / totalTrade * 100).toFixed(1)) : 33.3,
        holdPercent: totalTrade > 0 ? parseFloat((holdCount / totalTrade * 100).toFixed(1)) : 33.4,
        totalTradeVotes: totalTrade
      }
    };

    // Generate AI analysis
    console.log(`🤖 [AI_SCHEDULER] Generating AI analysis for ${asset.short} using Gemini...`);
    const analysis = await geminiService.generateIntelligenceAnalysis(assetData);
    
    if (analysis && analysis.final_summary) {
      console.log(`✅ [AI_SCHEDULER] AI analysis completed for ${asset.short}`);
      console.log(`📊 [AI_ANALYSIS_DATA] Asset: ${asset.short}`);
      console.log(`📰 [AI_ANALYSIS_DATA] Global News: ${analysis.global_news_summary?.substring(0, 100)}...`);
      console.log(`💬 [AI_ANALYSIS_DATA] User Comments: ${analysis.user_comments_summary?.substring(0, 100)}...`);
      console.log(`📈 [AI_ANALYSIS_DATA] Market Sentiment: ${analysis.market_sentiment_summary?.substring(0, 100)}...`);
      console.log(`🎯 [AI_ANALYSIS_DATA] Final Summary: ${analysis.final_summary?.substring(0, 100)}...`);
      
      // Store in cache
      AI_ANALYSIS_CACHE.set(asset.short.toUpperCase(), {
        ...analysis,
        asset_symbol: asset.short,
        asset_name: asset.name,
        asset_type: asset.type,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + TTL_MS).toISOString(),
        data_points: {
          comments_count: recentComments.length,
          sentiment_votes: totalSentiment,
          trade_votes: totalTrade,
          bullish_percent: parseFloat(bullishPercent),
          buy_percent: parseFloat(buyPercent)
        }
      });
      
      return analysis;
    } else {
      console.log(`⚠️ [AI_SCHEDULER] No analysis generated for ${asset.short}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ [AI_SCHEDULER] Error analyzing ${asset.symbol}:`, error.message);
    return null;
  }
};

// Get cached AI analysis data
const getAIAnalysisData = (assetSymbol) => {
  const key = String(assetSymbol || '').toUpperCase();
  const cached = AI_ANALYSIS_CACHE.get(key);

  if (cached && Date.now() < new Date(cached.expires_at).getTime()) {
    return cached;
  }

  return null;
};

// Hourly job - processes one asset per hour
const hourlyAIJob = cron.schedule('0 * * * *', async () => {
  // Run every hour at minute 0
  const jobStartTime = Date.now();
  const currentHour = new Date().getHours();
  
  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🤖 [AI_SCHEDULER] Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
      console.log('✅ [AI_SCHEDULER] MongoDB connected successfully');
    }

    // Get all assets
    const allAssets = getAllAssets();
    const totalAssets = allAssets.length;
    
    // Calculate which asset to process this hour (cycle through all assets)
    const assetIndex = currentHour % totalAssets;
    const currentAsset = allAssets[assetIndex];
    
    console.log(`🤖 [AI_SCHEDULER] Hourly AI analysis - Hour ${currentHour}, Asset ${assetIndex + 1}/${totalAssets}: ${currentAsset.symbol} (${currentAsset.type})`);
    
    // Check if Gemini is available
    const geminiAvailable = await geminiService.isAvailable();
    if (!geminiAvailable) {
      console.warn('⚠️ [AI_SCHEDULER] Gemini AI not available, skipping analysis');
      return;
    }
    
    // Analyze the current asset
    const analysis = await analyzeAssetForAI(currentAsset);
    
    if (analysis) {
      console.log(`✅ [AI_SCHEDULER] Successfully generated analysis for ${currentAsset.symbol}`);
    } else {
      console.log(`⚠️ [AI_SCHEDULER] Failed to generate analysis for ${currentAsset.symbol}`);
    }
    
    // Log cache status
    console.log(`📊 [AI_SCHEDULER] Cache status: ${AI_ANALYSIS_CACHE.size}/${totalAssets} assets have fresh analysis`);
    
    // Check for expired entries and clean them up
    const now = Date.now();
    let expiredCount = 0;
    for (const [key, value] of AI_ANALYSIS_CACHE.entries()) {
      if (now >= new Date(value.expires_at).getTime()) {
        AI_ANALYSIS_CACHE.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`🧹 [AI_SCHEDULER] Cleaned up ${expiredCount} expired entries`);
    }
    
    const jobDuration = Date.now() - jobStartTime;
    console.log(`✅ [AI_SCHEDULER] Hourly job completed in ${jobDuration}ms`);
    
  } catch (error) {
    console.error('❌ [AI_SCHEDULER] Error in hourly AI job:', error.message);
  }
}, {
  scheduled: false // Don't start automatically
});

// Initialize job - generate analysis for first few assets immediately
const initializeAIAnalysis = async () => {
  console.log('🚀 [AI_SCHEDULER] Initializing AI analysis system...');
  
  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
    }
    
    const allAssets = getAllAssets();
    const geminiAvailable = await geminiService.isAvailable();
    
    if (!geminiAvailable) {
      console.warn('⚠️ [AI_SCHEDULER] Gemini AI not available, skipping initialization');
      return;
    }
    
    // Generate analysis for first 3 assets immediately (for immediate availability)
    const initialAssets = allAssets.slice(0, 3);
    console.log(`🤖 [AI_SCHEDULER] Generating initial analysis for ${initialAssets.length} assets...`);
    
    for (const asset of initialAssets) {
      await analyzeAssetForAI(asset);
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ [AI_SCHEDULER] Initialization complete. ${AI_ANALYSIS_CACHE.size} assets have analysis.`);
    
  } catch (error) {
    console.error('❌ [AI_SCHEDULER] Initialization failed:', error.message);
  }
};

module.exports = {
  hourlyAIJob,
  initializeAIAnalysis,
  getAIAnalysisData,
  AI_ANALYSIS_CACHE
};
