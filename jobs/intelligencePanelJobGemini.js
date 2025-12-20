const cron = require('node-cron');
const mongoose = require('mongoose');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const Comment = require('../models/Comment');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');
const geminiService = require('../services/geminiService');
const Intelligence = require('../models/Intelligence');
require('dotenv').config();

// Cache for intelligence panel data (24h TTL)
const INTELLIGENCE_CACHE = new Map();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Analyze asset data for Gemini AI
const analyzeAssetDataForGemini = async (assetSymbol) => {
  try {
    // Get recent comments
    const recentComments = await Comment.find({
      assetSymbol: assetSymbol.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get sentiment votes
    const sentimentVotes = await SentimentVote.find({
      assetSymbol: assetSymbol.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get trade intent votes
    const tradeVotes = await TradeIntentVote.find({
      assetSymbol: assetSymbol.toUpperCase(),
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
      assetSymbol,
      assetName: assetSymbol, // Will be enhanced with actual name
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

    // Use Gemini AI for analysis
    console.log(`🤖 [INTELLIGENCE] Generating AI analysis for ${assetSymbol} using Gemini...`);
    const analysis = await geminiService.generateIntelligenceAnalysis(assetData);

    if (analysis && analysis.final_summary) {
      console.log(`✅ [INTELLIGENCE] AI analysis completed for ${assetSymbol}`);
      console.log(`📊 [AI_ANALYSIS_DATA] Asset: ${assetSymbol}`);
      console.log(`📰 [AI_ANALYSIS_DATA] Global News: ${analysis.global_news_summary}`);
      console.log(`💬 [AI_ANALYSIS_DATA] User Comments: ${analysis.user_comments_summary}`);
      console.log(`📈 [AI_ANALYSIS_DATA] Market Sentiment: ${analysis.market_sentiment_summary}`);
      console.log(`🎯 [AI_ANALYSIS_DATA] Final Summary: ${analysis.final_summary}`);

      INTELLIGENCE_CACHE.set(assetSymbol.toUpperCase(), {
        ...analysis,
        generated_at: new Date().toISOString(),
        data_points: {
          comments_count: assetData.userComments.length,
          sentiment_votes: Object.values(assetData.sentimentVotes).reduce((a, b) => a + b, 0),
          trade_votes: Object.values(assetData.tradeVotes).reduce((a, b) => a + b, 0),
          bullish_percent: calculatePercentage(assetData.sentimentVotes.bullish, assetData.sentimentVotes),
          buy_percent: calculatePercentage(assetData.tradeVotes.buy, assetData.tradeVotes)
        },
        at: Date.now()
      });
    } else {
      console.log(`⚠️ [INTELLIGENCE] No analysis generated for ${assetSymbol}`);
    }

    // Store in database
    try {
      await Intelligence.findOneAndUpdate(
        { asset: assetSymbol.toUpperCase() },
        {
          asset: assetSymbol.toUpperCase(),
          assetType: assetSymbol.length <= 5 && assetSymbol !== 'RELIANCE' && assetSymbol !== 'INFOSYS' ? 'crypto' : 'stock', // Simple heuristic
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
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        { upsert: true, new: true }
      );
      console.log(`💾 [INTELLIGENCE] Saved to database: ${assetSymbol}`);
    } catch (dbError) {
      console.error(`❌ [INTELLIGENCE] Database save failed for ${assetSymbol}:`, dbError.message);
    }

    // Add data points for tracking
    return {
      ...analysis,
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

// Fallback analysis function (if Gemini fails)
const generateFallbackAnalysis = async (assetSymbol) => {
  try {
    // Get recent comments
    const recentComments = await Comment.find({
      assetSymbol: assetSymbol.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get sentiment votes
    const sentimentVotes = await SentimentVote.find({
      assetSymbol: assetSymbol.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get trade intent votes
    const tradeVotes = await TradeIntentVote.find({
      assetSymbol: assetSymbol.toUpperCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate distributions
    const bullishCount = sentimentVotes.filter(v => v.sentiment === 'bullish').length;
    const bearishCount = sentimentVotes.filter(v => v.sentiment === 'bearish').length;
    const totalSentiment = bullishCount + bearishCount;
    const bullishPercent = totalSentiment > 0 ? (bullishCount / totalSentiment * 100).toFixed(1) : 50;

    const buyCount = tradeVotes.filter(v => v.action === 'buy').length;
    const sellCount = tradeVotes.filter(v => v.action === 'sell').length;
    const holdCount = tradeVotes.filter(v => v.action === 'hold').length;
    const totalTrade = buyCount + sellCount + holdCount;
    const buyPercent = totalTrade > 0 ? (buyCount / totalTrade * 100).toFixed(1) : 33.3;

    const fallbackAnalysis = {
      global_news_summary: `${assetSymbol} operates in dynamic financial markets influenced by sector performance, economic indicators, and market sentiment. Recent market conditions show increased volatility across various segments, creating both opportunities and risks for investors.`,
      user_comments_summary: recentComments.length > 0
        ? `Recent community activity shows ${recentComments.length} comments discussing various aspects of ${assetSymbol}, including technical analysis, fundamental factors, and market positioning strategies.`
        : `${assetSymbol} attracts investor interest with focus on price movements, sector trends, and market conditions. Community engagement centers around technical levels and fundamental analysis.`,
      market_sentiment_summary: totalSentiment > 0
        ? `Market sentiment for ${assetSymbol} shows ${bullishPercent}% bullish vs ${100 - bullishPercent}% bearish based on ${totalSentiment} votes. Current sentiment reflects market conditions and sector performance.`
        : `${assetSymbol} demonstrates balanced market sentiment typical of current market conditions. Monitor volume patterns and technical indicators for sentiment shifts.`,
      final_summary: `${assetSymbol} presents investment opportunities requiring careful analysis of market conditions, sector trends, and risk factors. Consider fundamental strength, technical position, and market timing. Implement disciplined risk management with appropriate position sizing and stop-loss strategies.`,
      generated_at: new Date().toISOString(),
      analysis_provider: 'fallback',
      data_points: {
        comments_count: recentComments.length,
        sentiment_votes: totalSentiment,
        trade_votes: totalTrade,
        bullish_percent: parseFloat(bullishPercent),
        buy_percent: parseFloat(buyPercent)
      }
    };

    // Store in database
    try {
      await Intelligence.findOneAndUpdate(
        { asset: assetSymbol.toUpperCase() },
        {
          asset: assetSymbol.toUpperCase(),
          assetType: assetSymbol.length <= 5 && assetSymbol !== 'RELIANCE' && assetSymbol !== 'INFOSYS' ? 'crypto' : 'stock',
          global_news_summary: fallbackAnalysis.global_news_summary,
          user_comments_summary: fallbackAnalysis.user_comments_summary,
          market_sentiment_summary: fallbackAnalysis.market_sentiment_summary,
          final_summary: fallbackAnalysis.final_summary,
          data_points: [
            { type: 'comments_count', value: fallbackAnalysis.data_points.comments_count, label: 'Comments Count' },
            { type: 'sentiment_votes', value: fallbackAnalysis.data_points.sentiment_votes, label: 'Sentiment Votes' },
            { type: 'trade_votes', value: fallbackAnalysis.data_points.trade_votes, label: 'Trade Votes' },
            { type: 'bullish_percent', value: fallbackAnalysis.data_points.bullish_percent, label: 'Bullish Percentage' },
            { type: 'buy_percent', value: fallbackAnalysis.data_points.buy_percent, label: 'Buy Percentage' }
          ],
          analysis_provider: fallbackAnalysis.analysis_provider,
          generated_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        { upsert: true, new: true }
      );
      console.log(`💾 [INTELLIGENCE] Saved fallback to database: ${assetSymbol}`);
    } catch (dbError) {
      console.error(`❌ [INTELLIGENCE] Database save failed for ${assetSymbol}:`, dbError.message);
    }

    return fallbackAnalysis;
  } catch (error) {
    console.error(`Fallback analysis failed for ${assetSymbol}:`, error.message);
    return null;
  }
};

// Daily job to pre-calculate intelligence panel data (runs once at 3 AM)
const intelligencePanelJob = cron.schedule('0 3 * * *', async () => {
  // Run every day at 3:00 AM
  const jobStartTime = Date.now();
  console.log('🤖 [INTELLIGENCE] Starting daily intelligence panel data generation with Gemini AI...');
  console.log(`🤖 [INTELLIGENCE] Job scheduled at: ${new Date().toISOString()}`);

  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      console.log('🤖 [INTELLIGENCE] Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
      console.log('✅ [INTELLIGENCE] MongoDB connected successfully');
    } else {
      console.log('✅ [INTELLIGENCE] MongoDB already connected');
    }

    console.log(`🧠 [INTELLIGENCE] Starting daily intelligence panel job...`);
    console.log(`🧠 [INTELLIGENCE] Job scheduled to run at: ${cron.schedule('0 3 * * *')} (every day at 3 AM)`);

    // Check MongoDB connection
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ [INTELLIGENCE] MongoDB connected successfully');
    } catch (error) {
      console.error('❌ [INTELLIGENCE] MongoDB connection failed:', error);
      return;
    }

    // Check if Gemini is available
    console.log('🤖 [INTELLIGENCE] Checking Gemini AI availability...');
    const geminiAvailable = await geminiService.isAvailable();
    console.log(`🤖 [INTELLIGENCE] Gemini AI available: ${geminiAvailable}`);

    if (!geminiAvailable) {
      console.warn('⚠️ [INTELLIGENCE] Gemini AI not available, using fallback analysis');
    } else {
      console.log('✅ [INTELLIGENCE] Gemini AI is available');
    }

    // Get all assets (crypto + stocks)
    const allAssets = [
      ...cryptoAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'crypto' })),
      ...stockAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'stock' }))
    ];

    console.log(`🤖 [INTELLIGENCE] Processing ${allAssets.length} assets (${allAssets.filter(a => a.type === 'crypto').length} crypto, ${allAssets.filter(a => a.type === 'stock').length} stocks)...`);

    let successCount = 0;
    let failureCount = 0;
    let geminiCount = 0;
    let fallbackCount = 0;

    for (const asset of allAssets) {
      const assetStartTime = Date.now();
      const assetSymbol = asset.type === 'crypto' ? asset.short : asset.symbol; // Use short for crypto, full symbol for stocks
      console.log(`🤖 [INTELLIGENCE] Processing ${assetSymbol} (${asset.type})...`);

      try {
        let summary;

        // Try Gemini first, fallback to basic analysis if it fails
        if (geminiAvailable) {
          try {
            console.log(`🤖 [INTELLIGENCE] Using Gemini AI for ${assetSymbol}...`);
            summary = await analyzeAssetDataForGemini(assetSymbol);
            if (!summary) {
              console.warn(`⚠️ [INTELLIGENCE] Gemini analysis returned null for ${assetSymbol}, trying fallback`);
              summary = await generateFallbackAnalysis(assetSymbol);
              fallbackCount++;
            } else {
              geminiCount++;
            }
          } catch (geminiError) {
            console.warn(`⚠️ [INTELLIGENCE] Gemini analysis failed for ${assetSymbol}: ${geminiError.message}, using fallback`);
            summary = await generateFallbackAnalysis(assetSymbol);
            fallbackCount++;
          }
        } else {
          console.log(`🤖 [INTELLIGENCE] Using fallback analysis for ${assetSymbol}...`);
          summary = await generateFallbackAnalysis(assetSymbol);
          fallbackCount++;
        }

        if (summary) {
          // Cache the summary
          INTELLIGENCE_CACHE.set(assetSymbol.toUpperCase(), {
            at: Date.now(),
            data: summary
          });

          const provider = summary.analysis_provider || 'unknown';
          const assetDuration = Date.now() - assetStartTime;
          console.log(`✅ [INTELLIGENCE] Generated intelligence for ${assetSymbol} (${asset.type}) using ${provider} in ${assetDuration}ms`);
          successCount++;
        } else {
          console.log(`⚠️ [INTELLIGENCE] Failed to generate intelligence for ${assetSymbol}`);
          failureCount++;
        }
      } catch (error) {
        const assetDuration = Date.now() - assetStartTime;
        console.error(`❌ [INTELLIGENCE] Error processing ${assetSymbol} after ${assetDuration}ms:`, error.message);
        failureCount++;
      }
    }

    const jobDuration = Date.now() - jobStartTime;
    console.log(`✅ [INTELLIGENCE] Job completed in ${jobDuration}ms`);
    console.log(`📊 [INTELLIGENCE] Results: ${successCount} successful, ${failureCount} failed, ${geminiCount} Gemini, ${fallbackCount} fallback`);
    console.log(`✅ [INTELLIGENCE] Intelligence panel data generated for ${INTELLIGENCE_CACHE.size} assets`);
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

    // Check if Gemini is available
    const geminiAvailable = await geminiService.isAvailable();
    if (!geminiAvailable) {
      console.warn('⚠️ Gemini AI not available, using fallback analysis');
    }

    // Get all assets (crypto + stocks)
    const allAssets = [
      ...cryptoAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'crypto', short: asset.short })),
      ...stockAssets.map(asset => ({ symbol: asset.symbol, name: asset.name, type: 'stock' }))
    ];

    console.log(`Processing ${allAssets.length} assets...`);

    for (const asset of allAssets) {
      try {
        const assetSymbol = asset.type === 'crypto' ? asset.short : asset.symbol; // Use short for crypto, full symbol for stocks
        let summary;

        // Try Gemini first, fallback to basic analysis if it fails
        if (geminiAvailable) {
          try {
            summary = await analyzeAssetDataForGemini(assetSymbol);
            if (!summary) {
              console.warn(`⚠️ Gemini analysis returned null for ${assetSymbol}, trying fallback`);
              summary = await generateFallbackAnalysis(assetSymbol);
            }
          } catch (geminiError) {
            console.warn(`⚠️ Gemini analysis failed for ${assetSymbol}: ${geminiError.message}, using fallback`);
            summary = await generateFallbackAnalysis(assetSymbol);
          }
        } else {
          summary = await generateFallbackAnalysis(assetSymbol);
        }

        if (summary) {
          // Cache the summary
          INTELLIGENCE_CACHE.set(assetSymbol.toUpperCase(), {
            at: Date.now(),
            data: summary
          });

          const provider = summary.analysis_provider || 'unknown';
          console.log(`✅ Generated intelligence for ${assetSymbol} (${asset.type}) using ${provider}`);
        } else {
          console.log(`⚠️ Failed to generate intelligence for ${assetSymbol}`);
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
