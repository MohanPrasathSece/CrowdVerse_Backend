const mongoose = require('mongoose');
const { cryptoAssets, stockAssets } = require('./constants/marketAssets');
const Intelligence = require('./models/Intelligence');
const Comment = require('./models/Comment');
const SentimentVote = require('./models/SentimentVote');
const TradeIntentVote = require('./models/TradeIntentVote');
const User = require('./models/User');
require('dotenv').config();

// Generate intelligence data for a single asset
const generateIntelligenceData = async (assetSymbol, assetType, assetName) => {
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

    // Create summaries based on actual data
    const commentSummary = recentComments.length > 0 
      ? `Community shows ${recentComments.length} recent comments discussing ${assetName}. User engagement focuses on price movements, technical analysis, and market sentiment.`
      : `No recent community comments for ${assetName}.`;

    const sentimentSummary = totalSentiment > 0
      ? `Market sentiment for ${assetName} shows ${bullishPercent}% bullish vs ${(100-bullishPercent).toFixed(1)}% bearish based on ${totalSentiment} community votes.`
      : `No sentiment data available for ${assetName}.`;

    const tradeSummary = totalTrade > 0
      ? `Trade intent indicates ${buyPercent}% buyers, ${sellPercent}% sellers, and ${holdPercent}% holders among ${totalTrade} community votes.`
      : `No trade intent data available for ${assetName}.`;

    // Asset-specific news summaries
    const newsSummaries = {
      'BTC': 'Bitcoin shows mixed signals as institutional adoption continues while regulatory concerns persist. Market watchers eye key resistance levels.',
      'ETH': 'Ethereum benefits from DeFi growth and Layer 2 solutions, though network congestion remains a concern for users.',
      'SOL': 'Solana maintains strong developer activity despite past network issues. NFT and DeFi ecosystems continue expanding.',
      'DOGE': 'Dogecoin community remains active with social media driving volatility. Institutional interest remains limited.',
      'ADA': 'Cardano focuses on smart contract development and ecosystem growth. Technical upgrades show progress in adoption.',
      'XRP': 'Ripple faces regulatory uncertainty while maintaining partnerships with financial institutions for cross-border payments.',
      'DOT': 'Polkadot parachain ecosystem grows steadily. Interoperability features attract developers seeking cross-chain solutions.',
      'AVAX': 'Avalanche gains traction in DeFi and gaming sectors. Network performance improvements boost user confidence.',
      'LINK': 'Chainlink oracle network remains essential for DeFi operations. Partnerships with traditional finance expand use cases.',
      'MATIC': 'Polygon continues scaling Ethereum with low-cost solutions. ZK-rollout technology enhances network capabilities.',
      'RELIANCE': 'Reliance Industries shows strong performance in telecom and retail segments. Energy business faces global market challenges.',
      'TCS': 'Tata Consultancy Services maintains IT leadership with digital transformation services. Global demand remains robust.',
      'HDFCBANK': 'HDFC Bank demonstrates steady growth in retail banking. Asset quality metrics remain within regulatory norms.',
      'INFY': 'Infosys benefits from AI and cloud services demand. North American markets show strong adoption patterns.',
      'ICICIBANK': 'ICICI Bank expands digital banking services. Loan growth balanced with risk management practices.',
      'SBIN': 'State Bank of India shows improvement in asset quality. Government reforms support banking sector growth.',
      'LT': 'Larsen & Toubro wins infrastructure contracts domestically. International projects face execution challenges.',
      'ITC': 'ITC diversifies beyond cigarettes into FMCG and hospitality. Market share gains in packaged foods segment.',
      'AXISBANK': 'Axis Bank focuses on retail and SME lending. Digital initiatives improve customer experience metrics.',
      'KOTAKBANK': 'Kotak Mahindra Bank maintains strong asset quality. Wealth management services show consistent growth.'
    };

    const newsSummary = newsSummaries[assetSymbol] || `Recent market activity for ${assetName} reflects broader sector trends and investor sentiment.`;

    // Create final summary
    const finalTakeaway = `${assetName} shows ${bullishPercent}% bullish sentiment with ${recentComments.length > 0 ? 'active' : 'limited'} community engagement. Trade intent favors ${buyPercent > sellPercent ? 'buying' : sellPercent > buyPercent ? 'selling' : 'holding'}. Monitor key technical levels and market developments.`;

    // Create data points
    const dataPoints = [
      {
        type: 'sentiment_distribution',
        value: { bullish: bullishCount, bearish: bearishCount, total: totalSentiment },
        label: 'Sentiment Distribution'
      },
      {
        type: 'trade_intent_distribution',
        value: { buy: buyCount, sell: sellCount, hold: holdCount, total: totalTrade },
        label: 'Trade Intent Distribution'
      },
      {
        type: 'community_engagement',
        value: { comments_count: recentComments.length, active_discussions: recentComments.length > 0 },
        label: 'Community Engagement'
      },
      {
        type: 'market_metrics',
        value: { bullish_percent: parseFloat(bullishPercent), buy_percent: parseFloat(buyPercent) },
        label: 'Market Metrics'
      }
    ];

    return {
      asset: assetSymbol,
      assetType,
      global_news_summary: newsSummary,
      user_comments_summary: commentSummary,
      market_sentiment_summary: sentimentSummary,
      final_summary: finalTakeaway,
      data_points: dataPoints,
      analysis_provider: 'system',
      generated_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  } catch (error) {
    console.error(`Error generating intelligence for ${assetSymbol}:`, error.message);
    return null;
  }
};

// Main upload function
const uploadIntelligenceData = async () => {
  try {
    console.log('🚀 Starting intelligence data upload for all assets...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
    console.log('✅ Connected to MongoDB');

    // Get all assets
    const allAssets = [
      ...cryptoAssets.map(asset => ({ 
        symbol: asset.short || asset.symbol.split(':')[1], 
        name: asset.name, 
        type: 'crypto' 
      })),
      ...stockAssets.map(asset => ({ 
        symbol: asset.symbol, 
        name: asset.name, 
        type: 'stock' 
      }))
    ];

    console.log(`📊 Processing ${allAssets.length} assets (${allAssets.filter(a => a.type === 'crypto').length} cryptos, ${allAssets.filter(a => a.type === 'stock').length} stocks)`);

    let successCount = 0;
    let failureCount = 0;

    for (const asset of allAssets) {
      try {
        console.log(`\n🔄 Processing ${asset.symbol} (${asset.type})...`);
        
        // Generate intelligence data
        const intelligenceData = await generateIntelligenceData(asset.symbol, asset.type, asset.name);
        
        if (intelligenceData) {
          // Upsert to database (update if exists, insert if new)
          await Intelligence.findOneAndUpdate(
            { asset: asset.symbol, assetType: asset.type },
            intelligenceData,
            { upsert: true, new: true }
          );
          
          console.log(`✅ Uploaded intelligence for ${asset.symbol}`);
          successCount++;
        } else {
          console.log(`❌ Failed to generate intelligence for ${asset.symbol}`);
          failureCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${asset.symbol}:`, error.message);
        failureCount++;
      }
    }

    console.log(`\n📈 Upload Summary:`);
    console.log(`✅ Successfully uploaded: ${successCount} assets`);
    console.log(`❌ Failed: ${failureCount} assets`);
    console.log(`📊 Total processed: ${allAssets.length} assets`);

    // Verify upload
    const totalInDb = await Intelligence.countDocuments();
    console.log(`📋 Total intelligence records in database: ${totalInDb}`);

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🏁 Intelligence data upload completed');
  }
};

// Run the upload
if (require.main === module) {
  uploadIntelligenceData();
}

module.exports = { uploadIntelligenceData, generateIntelligenceData };
