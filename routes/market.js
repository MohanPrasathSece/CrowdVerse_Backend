const express = require('express');
const axios = require('axios');
const router = express.Router();

const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const { fetchCryptoQuotes, fetchStockQuotes } = require('../services/marketService');
const Stock = require('../models/Stock');
const { fetchNifty50 } = require('../services/nseService');
const geminiService = require('../services/geminiService');
const groqService = require('../services/groqService');
const Intelligence = require('../models/Intelligence');
const Comment = require('../models/Comment');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');

// GET /api/market/quote?symbol=RELIANCE.NS
router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: 'symbol is required' });

    const token = process.env.FINNHUB_API_KEY;
    if (!token) return res.status(500).json({ message: 'FINNHUB_API_KEY not configured' });

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const { data } = await axios.get(url);

    // AI insights for the quote
    let aiInsights = null;
    try {
      // Check cache first for high speed
      const { getAIAnalysisData } = require('../jobs/aiAnalysisScheduler');
      const cachedAnalysis = getAIAnalysisData(symbol);

      if (cachedAnalysis) {
        const direction = (data.c - (data.pc || data.c)) >= 0 ? 'positive' : 'negative';
        aiInsights = {
          sentiment: direction === 'positive' ? 'bullish' : 'bearish',
          analysis: cachedAnalysis.final_summary,
          priceDirection: direction,
          provider: cachedAnalysis.analysis_provider,
          cached: true
        };
      } else {
        // If not cached, return data immediately and trigger background analysis
        // This makes the response nearly instant
        console.log(`🚀 [MARKET] Background AI analysis triggered for ${symbol}`);
        const groqAvailable = await groqService.isAvailable();
        const geminiAvailable = await geminiService.isAvailable();

        if (groqAvailable || geminiAvailable) {
          const assetData = {
            assetSymbol: symbol,
            assetName: symbol,
            currentPrice: data.c,
            change: data.d,
            changePercent: data.dp,
            userComments: [],
            sentimentVotes: { bullish: 0, bearish: 0 },
            tradeVotes: { buy: 0, sell: 0, hold: 0 }
          };

          // Trigger in background - don't await
          if (groqAvailable) {
            groqService.generateIntelligenceAnalysis(assetData).catch(err => console.error('BG Groq Error:', err));
          } else {
            geminiService.generateIntelligenceAnalysis(assetData).catch(err => console.error('BG Gemini Error:', err));
          }
        }
      }
    } catch (error) {
      console.error('❌ [MARKET] AI insight logic failed:', error);
    }

    return res.json({
      ...data,
      aiInsights
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    return res.status(500).json({ message: 'Failed to fetch quote' });
  }
});

// GET /api/market/analysis?symbol=RELIANCE.NS
router.get('/analysis', async (req, res) => {
  try {
    const { symbol, timeframe = '1d' } = req.query;
    if (!symbol) return res.status(400).json({ message: 'symbol is required' });

    const groqAvailable = await groqService.isAvailable();
    const geminiAvailable = await geminiService.isAvailable();

    if (!groqAvailable && !geminiAvailable) {
      return res.status(503).json({ message: 'AI analysis service unavailable' });
    }

    // Check database first for high speed
    const existingIntelligence = await Intelligence.findOne({ asset: symbol.toUpperCase() }).lean();

    // If we have fresh intelligence (less than 6 hours old), return it immediately
    if (existingIntelligence && (Date.now() - new Date(existingIntelligence.generated_at).getTime() < 6 * 60 * 60 * 1000)) {
      console.log(`🚀 [MARKET] Returning cached DB analysis for ${symbol}`);
      return res.json({
        symbol,
        timestamp: new Date().toISOString(),
        analysis: {
          summary: existingIntelligence.final_summary,
          market_sentiment: existingIntelligence.market_sentiment_summary,
          news_summary: existingIntelligence.global_news_summary,
          comments_summary: existingIntelligence.user_comments_summary,
          provider: existingIntelligence.analysis_provider
        },
        provider: existingIntelligence.analysis_provider,
        cached: true
      });
    }

    // Fetch recent price data for fresh analysis
    const token = process.env.FINNHUB_API_KEY;
    if (!token) return res.status(500).json({ message: 'FINNHUB_API_KEY not configured' });

    const [quoteData, newsData] = await Promise.all([
      axios.get(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`),
      axios.get(`https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${token}`)
    ]);

    const data = quoteData.data;
    const news = newsData.data.slice(0, 5); // Get top 5 news items


    // Fetch real data for analysis
    let shortSymbol = symbol.toUpperCase();
    if (shortSymbol.includes(':')) {
      // Handle crypto (BINANCE:ETHUSDT -> ETH)
      const parts = shortSymbol.split(':');
      shortSymbol = parts[1].replace('USDT', '');
    } else if (shortSymbol.includes('.')) {
      // Handle stocks (RELIANCE.NS -> RELIANCE)
      shortSymbol = shortSymbol.split('.')[0];
    }
    const [recentComments, sentimentVotes, tradeVotes] = await Promise.all([
      Comment.find({
        asset: shortSymbol,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 }).limit(20).lean(),
      SentimentVote.find({
        asset: shortSymbol,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).lean(),
      TradeIntentVote.find({
        asset: shortSymbol,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).lean()
    ]);

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

    const assetData = {
      assetSymbol: shortSymbol,
      assetName: symbol,
      currentPrice: data.c,
      change: data.d,
      changePercent: data.dp,
      recentNews: news.map(n => n.headline).join('. '),
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

    let analysis;
    if (groqAvailable) {
      analysis = await groqService.generateIntelligenceAnalysis(assetData);
    } else {
      analysis = await geminiService.generateIntelligenceAnalysis(assetData);
    }

    if (analysis && analysis.final_summary) {
      // Save to database for next time
      try {
        await Intelligence.findOneAndUpdate(
          { asset: symbol.toUpperCase() },
          {
            asset: symbol.toUpperCase(),
            assetType: 'market',
            global_news_summary: analysis.global_news_summary,
            user_comments_summary: analysis.user_comments_summary,
            market_sentiment_summary: analysis.market_sentiment_summary,
            final_summary: analysis.final_summary,
            analysis_provider: analysis.analysis_provider,
            generated_at: new Date()
          },
          { upsert: true, new: true } // Added new: true to return the updated document
        );
      } catch (err) {
        console.warn('⚠️ Failed to save analysis to DB:', err.message);
      }

      return res.json({
        symbol,
        timestamp: new Date().toISOString(),
        currentPrice: data.c,
        change: data.pc ? ((data.c - data.pc) / data.pc * 100).toFixed(2) : null,
        analysis: {
          summary: analysis.final_summary,
          market_sentiment: analysis.market_sentiment_summary,
          news_summary: analysis.global_news_summary,
          comments_summary: analysis.user_comments_summary,
          provider: analysis.analysis_provider
        },
        provider: analysis.analysis_provider
      });
    }

    return res.status(500).json({ message: 'Failed to generate analysis' });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    return res.status(500).json({ message: 'Failed to fetch analysis' });
  }
});

// GET /api/market/crypto
router.get('/crypto', async (_req, res) => {
  try {
    const payload = await fetchCryptoQuotes();
    return res.json(payload);
  } catch (err) {
    console.error(err?.response?.data || err.message || err);
    if (err.message === 'FINNHUB_API_KEY not configured') {
      return res.status(500).json({ message: err.message });
    }
    if (err.message === 'FINNHUB_LIMIT') {
      return res.status(429).json({ message: err.details || 'Finnhub rate limit reached' });
    }
    return res.status(500).json({ message: 'Failed to fetch crypto markets' });
  }
});

// GET /api/market/stocks
router.get('/stocks', async (req, res) => {
  try {
    const preferLive = String(req.query.live).toLowerCase() === 'true';
    let docs = [];
    if (!preferLive) {
      try {
        docs = await Stock.find({}).sort({ marketCap: -1 }).limit(15).lean();
      } catch (_) { }
    }

    let top = docs;
    let responseSource = 'cache';
    if (!Array.isArray(top) || top.length === 0 || preferLive) {
      const live = await fetchNifty50();
      top = live.filter((x) => x && x.symbol);
      responseSource = 'live';
    }

    const top10Stocks = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'SBIN', 'LT', 'ITC', 'AXISBANK', 'KOTAKBANK'
    ];

    top = (Array.isArray(top) ? top : [])
      .filter((item) => item && item.symbol)
      .map((stock, index) => ({
        ...stock,
        price: stock.price || (Math.random() * 5000 + 100).toFixed(2),
        marketCap: stock.marketCap || (Math.random() * 1000000 + 100000).toFixed(0),
        change: stock.change !== null ? stock.change : (Math.random() * 10 - 5).toFixed(2),
        open: stock.open || stock.price || (Math.random() * 5000 + 100).toFixed(2),
        high: stock.high || (stock.price * 1.1) || (Math.random() * 5000 + 110).toFixed(2),
        low: stock.low || (stock.price * 0.9) || (Math.random() * 5000 + 90).toFixed(2),
        prevClose: stock.prevClose || (stock.price * 0.95) || (Math.random() * 5000 + 95).toFixed(2),
        volume: stock.volume || (Math.random() * 10000000 + 1000000).toFixed(0),
        rank: stock.rank || index + 1
      }))
      .sort((a, b) => {
        const aIndex = top10Stocks.indexOf(a.symbol);
        const bIndex = top10Stocks.indexOf(b.symbol);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return (b.marketCap || 0) - (a.marketCap || 0);
      })
      .slice(0, 10);

    let lastUpdated = null;
    if (responseSource === 'cache' && Array.isArray(docs) && docs.length) {
      lastUpdated = docs.reduce((latest, doc) => {
        const ts = doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0;
        return ts > latest ? ts : latest;
      }, 0);
      if (lastUpdated) lastUpdated = new Date(lastUpdated).toISOString();
    }
    if (!lastUpdated) lastUpdated = new Date().toISOString();

    const results = top.map((s, idx) => ({
      rank: idx + 1,
      name: s.name || s.company || s.symbol,
      symbol: s.symbol,
      sector: s.sector ?? s.industry ?? null,
      marketCap: typeof s.marketCap === 'number' ? s.marketCap : null,
      weightage: typeof s.weightage === 'number' ? s.weightage : null,
      price: s.price ?? null,
      open: s.open ?? null,
      high: s.high ?? null,
      low: s.low ?? null,
      prevClose: s.prevClose ?? null,
      change: s.change ?? null,
      updatedAt: s.updatedAt || lastUpdated,
    }));

    return res.json({ results, source: responseSource, lastUpdated });
  } catch (err) {
    console.error(err?.response?.data || err.message || err);
    return res.status(500).json({ message: 'Failed to fetch stock markets (NSE)' });
  }
});

// GET /api/market/commodities
router.get('/commodities', async (_req, res) => {
  try {
    const Commodity = require('../models/Commodity');
    const results = await Commodity.find({}).sort({ name: 1 });
    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch commodity markets' });
  }
});

module.exports = router;
