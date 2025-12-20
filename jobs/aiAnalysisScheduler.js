const cron = require('node-cron');
const mongoose = require('mongoose');
const axios = require('axios');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const Comment = require('../models/Comment');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');
const geminiService = require('../services/geminiService');
const groqService = require('../services/groqService');
const Intelligence = require('../models/Intelligence');
require('dotenv').config();

// Cache for AI analysis data (12h TTL)
const AI_ANALYSIS_CACHE = new Map();
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
//no
// Get all assets in a specific order for hourly generation
const getAllAssets = () => {
  return [
    ...cryptoAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'crypto', short: asset.short })),
    ...stockAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'stock', short: asset.symbol }))
  ];
};

// Get free news data for assets
const getFreeNewsData = async (asset) => {
  try {
    // Use Finnhub free API for news (already has API key)
    const finnhubToken = process.env.FINNHUB_API_KEY;
    if (!finnhubToken) {
      console.log(`⚠️ [AI_SCHEDULER] No FINNHUB_API_KEY for news data`);
      return [];
    }

    let symbol = asset.short;
    if (asset.type === 'stock') {
      symbol = `${symbol}.NS`; // Indian stocks
    } else if (asset.type === 'crypto') {
      symbol = asset.symbol; // Use full Binance symbol for better Finnhub news coverage
    }

    // Get news from last 7 days
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const newsResponse = await axios.get(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}&token=${finnhubToken}`,
      { timeout: 5000 }
    );

    if (newsResponse.data && Array.isArray(newsResponse.data)) {
      const news = newsResponse.data
        .slice(0, 5) // Get top 5 news items
        .map(article => article.headline)
        .filter(headline => headline && headline.length > 10);

      console.log(`📰 [AI_SCHEDULER] Found ${news.length} news items for ${symbol}`);
      return news;
    }

    return [];
  } catch (error) {
    console.log(`⚠️ [AI_SCHEDULER] News fetch failed for ${asset.short}: ${error.message}`);
    return [];
  }
};

// Analyze asset data for AI
const analyzeAssetForAI = async (asset) => {
  try {
    console.log(`🤖 [AI_SCHEDULER] Starting analysis for ${asset.symbol} (${asset.type})`);

    // Get free news data
    const newsData = await getFreeNewsData(asset);

    // Get recent comments
    const recentComments = await Comment.find({
      asset: asset.short.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get sentiment votes
    const sentimentVotes = await SentimentVote.find({
      asset: asset.short.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get trade intent votes
    const tradeVotes = await TradeIntentVote.find({
      asset: asset.short.toUpperCase(),
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
      recentNews: newsData.join('\n'), // Use real news data
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
    console.log(`🤖 [AI_SCHEDULER] Generating AI analysis for ${asset.short} using Groq...`);
    const groqAvailable = await groqService.isAvailable();
    const geminiAvailable = await geminiService.isAvailable();

    let analysis = null;
    if (groqAvailable) {
      analysis = await groqService.generateIntelligenceAnalysis(assetData);
    } else if (geminiAvailable) {
      analysis = await geminiService.generateIntelligenceAnalysis(assetData);
    }

    if (analysis && analysis.final_summary) {
      console.log(`✅ [AI_SCHEDULER] AI analysis completed for ${asset.short} via ${analysis.analysis_provider}`);
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

      // Store in database
      try {
        await Intelligence.findOneAndUpdate(
          { asset: asset.short.toUpperCase() },
          {
            asset: asset.short.toUpperCase(),
            assetType: asset.type,
            global_news_summary: analysis.global_news_summary,
            user_comments_summary: analysis.user_comments_summary,
            market_sentiment_summary: analysis.market_sentiment_summary,
            final_summary: analysis.final_summary,
            data_points: [
              { type: 'comments_count', value: recentComments.length, label: 'Comments Count' },
              { type: 'sentiment_votes', value: totalSentiment, label: 'Sentiment Votes' },
              { type: 'trade_votes', value: totalTrade, label: 'Trade Votes' },
              { type: 'bullish_percent', value: parseFloat(bullishPercent), label: 'Bullish Percentage' },
              { type: 'buy_percent', value: parseFloat(buyPercent), label: 'Buy Percentage' }
            ],
            analysis_provider: analysis.analysis_provider || 'gemini',
            generated_at: new Date(),
            expires_at: new Date(Date.now() + TTL_MS)
          },
          { upsert: true, new: true }
        );
        console.log(`💾 [AI_SCHEDULER] Saved to database: ${asset.short}`);
      } catch (dbError) {
        console.error(`❌ [AI_SCHEDULER] Database save failed for ${asset.short}:`, dbError.message);
      }

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

// Daily job - runs at 9:00 AM every day and processes all assets
const dailyAIJob = cron.schedule('0 9 * * *', async () => {
  // Run every day at 9:00 AM
  const jobStartTime = Date.now();

  try {
    console.log(`🌅 [AI_SCHEDULER] Starting daily AI analysis at 9:00 AM`);

    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🤖 [AI_SCHEDULER] Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
      console.log('✅ [AI_SCHEDULER] MongoDB connected successfully');
    }

    // Get all assets
    const allAssets = getAllAssets();
    const totalAssets = allAssets.length;

    console.log(`🤖 [AI_SCHEDULER] Daily analysis - Processing all ${totalAssets} assets`);

    // Check if Gemini is available
    const geminiAvailable = await geminiService.isAvailable();
    if (!geminiAvailable) {
      console.warn('⚠️ [AI_SCHEDULER] Gemini AI not available, skipping daily analysis');
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    // Process all assets with delay to avoid rate limiting
    for (let i = 0; i < allAssets.length; i++) {
      const asset = allAssets[i];
      console.log(`📊 [AI_SCHEDULER] Processing ${i + 1}/${totalAssets}: ${asset.symbol} (${asset.type})`);

      try {
        const analysis = await analyzeAssetForAI(asset);
        if (analysis) {
          successCount++;
          console.log(`✅ [AI_SCHEDULER] Success: ${asset.symbol}`);
        } else {
          failureCount++;
          console.log(`❌ [AI_SCHEDULER] Failed: ${asset.symbol}`);
        }

        // Delay between requests to avoid rate limiting (2 seconds)
        if (i < allAssets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        failureCount++;
        console.error(`❌ [AI_SCHEDULER] Error processing ${asset.symbol}:`, error.message);
      }
    }

    console.log(`📊 [AI_SCHEDULER] Daily analysis complete: ${successCount} success, ${failureCount} failures`);
    console.log(`💾 [AI_SCHEDULER] Cache status: ${AI_ANALYSIS_CACHE.size}/${totalAssets} assets have fresh analysis`);

    const jobDuration = Date.now() - jobStartTime;
    console.log(`✅ [AI_SCHEDULER] Daily job completed in ${jobDuration}ms (${(jobDuration / 1000).toFixed(1)}s)`);

  } catch (error) {
    console.error('❌ [AI_SCHEDULER] Error in daily AI job:', error.message);
  }
}, {
  scheduled: false // Don't start automatically
});

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
  dailyAIJob,
  hourlyAIJob,
  initializeAIAnalysis,
  getAIAnalysisData,
  AI_ANALYSIS_CACHE
};
