/*
Stray top-level provider code was accidentally placed here, causing 'await' at the top level.
Keeping it commented; the correct implementations live inside the async route handler below.
*/
const express = require('express');
const OpenAI = require('openai');
const axios = require('axios');
const router = express.Router();
const { getIntelligenceData } = require('../jobs/intelligencePanelJobGemini');
const geminiService = require('../services/geminiService');
const { getAIAnalysisData } = require('../jobs/aiAnalysisScheduler');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const Intelligence = require('../models/Intelligence');
const mongoose = require('mongoose');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free';
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || '';
const TOGETHER_MODEL = process.env.TOGETHER_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';
const HF_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HF_MODEL = process.env.HUGGINGFACE_MODEL || 'google/flan-t5-base';

// Simple in-memory cache per process (24h TTL)
const SUMMARY_CACHE = new Map(); // key -> { at: number, data: object }
const TTL_MS = 24 * 60 * 60 * 1000;

router.post('/', async (req, res) => {
  const { asset_name, recent_comments = [], recent_news = [], market_sentiment = '', refresh: refreshBody } = req.body || {};
  const AI_PROVIDER = String(process.env.AI_PROVIDER || '').toLowerCase();
  const refresh = String(req.query.refresh || '').toLowerCase() === 'true' || Boolean(refreshBody);
  const key = String(asset_name || '').toUpperCase();

  // Check if we have fresh data from the scheduler first
  const schedulerData = getAIAnalysisData(asset_name);
  if (schedulerData && !refresh) {
    console.log(`📋 [AI_SUMMARY] Using scheduler AI analysis for ${asset_name}`);
    const result = {
      global_news_summary: schedulerData.global_news_summary,
      user_comments_summary: schedulerData.user_comments_summary,
      market_sentiment_summary: schedulerData.market_sentiment_summary,
      final_summary: schedulerData.final_summary,
      generated_at: schedulerData.generated_at,
      analysis_provider: schedulerData.analysis_provider,
      asset_symbol: schedulerData.asset_symbol,
      asset_name: schedulerData.asset_name,
      processing_time_ms: schedulerData.processing_time_ms,
      data_points: schedulerData.data_points
    };
    return sendAndCache(result);
  }

  // Serve from cache if fresh and not forced to refresh
  const cached = SUMMARY_CACHE.get(key);
  if (!refresh && cached && Date.now() - cached.at < TTL_MS) {
    return res.json(cached.data);
  }

  // Ensure minimal, non-empty summaries
  const ensureFilled = (p) => {
    const a = String(asset_name || 'the asset');
    const safe = (s, def) => (String(s || '').trim().length > 10 ? String(s) : def);
    const fallback = {
      global_news_summary: `No major recent headlines detected. Consider historical performance and sector context for ${a}; watch upcoming earnings, guidance, or regulatory updates that may affect momentum.`,
      user_comments_summary: `Community commentary is limited for ${a}. Treat sentiment signals cautiously; combine with price action and volume to avoid bias.`,
      market_sentiment_summary: `When explicit sentiment data is sparse, assume mixed-to-neutral conditions and look for breakouts above resistance or failures at key levels to validate direction.`,
      final_summary: `Overall, build a plan for ${a}: define invalidation levels, position sizing, and news triggers. Use a checklist mindset until stronger catalysts or consensus emerge.`,
    };
    return {
      global_news_summary: safe(p.global_news_summary, fallback.global_news_summary),
      user_comments_summary: safe(p.user_comments_summary, fallback.user_comments_summary),
      market_sentiment_summary: safe(p.market_sentiment_summary, fallback.market_sentiment_summary),
      final_summary: safe(p.final_summary, fallback.final_summary),
    };
  };

  // Helper to cache and send
  const sendAndCache = (payload) => {
    const filled = ensureFilled(payload);
    try {
      SUMMARY_CACHE.set(key, { at: Date.now(), data: filled });
    } catch (_) {}
    return res.json(filled);
  };

  // Use Gemini AI as primary provider
  try {
    console.log(`🤖 [AI_SUMMARY] Using Gemini AI for ${asset_name}`);
    const geminiAvailable = await geminiService.isAvailable();
    
    if (geminiAvailable) {
      const prompt = `You are a financial research assistant. Summarize the following information about ${asset_name} into four concise sections with headers exactly in this order: Global News Summary, Community Comments Summary, Market Sentiment Summary, Final Takeaway. Keep each section short. If no recent news headlines are provided, use older but relevant widely-known events or market context; do not say news is unavailable.\n\nRecent News Headlines:\n${recent_news.join('\n')}\n\nUser Comments:\n${recent_comments.join('\n')}\n\nMarket Sentiment Data:\n${market_sentiment}`;
      
      const result = await geminiService.generateIntelligenceAnalysis({
        assetSymbol: asset_name,
        assetName: asset_name,
        recentNews: recent_news,
        userComments: recent_comments.join('\n'),
        sentimentData: market_sentiment ? { totalSentimentVotes: 10, bullishPercent: 75 } : {},
        marketData: market_sentiment ? { totalTradeVotes: 5, buyPercent: 60 } : {}
      });
      
      if (result && result.global_news_summary) {
        console.log(`✅ [AI_SUMMARY] Gemini AI analysis completed for ${asset_name}`);
        console.log(`📊 [AI_ANALYSIS_DATA] Provider: gemini`);
        console.log(`📰 [AI_ANALYSIS_DATA] Global News Summary: ${result.global_news_summary}`);
        console.log(`💬 [AI_ANALYSIS_DATA] User Comments Summary: ${result.user_comments_summary}`);
        console.log(`📈 [AI_ANALYSIS_DATA] Market Sentiment Summary: ${result.market_sentiment_summary}`);
        console.log(`🎯 [AI_ANALYSIS_DATA] Final Summary: ${result.final_summary}`);
        
        return sendAndCache({
          global_news_summary: result.global_news_summary,
          user_comments_summary: result.user_comments_summary,
          market_sentiment_summary: result.market_sentiment_summary,
          final_summary: result.final_summary,
          analysis_provider: 'gemini'
        });
      }
    }
  } catch (error) {
    console.error('❌ [AI_SUMMARY] Gemini AI error:', error);
  }

  // If explicitly requested, prefer OpenRouter first
  if (AI_PROVIDER === 'openrouter' && OPENROUTER_API_KEY) {
    try {
      const prompt = `You are a financial research assistant. Summarize the following information about ${asset_name} into four concise sections with headers exactly in this order: Global News Summary, Community Comments Summary, Market Sentiment Summary, Final Takeaway. Keep each section short. If no recent news headlines are provided, use older but relevant widely-known events or market context; do not say news is unavailable.\n\nRecent News Headlines:\n${recent_news.join('\n')}\n\nUser Comments:\n${recent_comments.join('\n')}\n\nMarket Sentiment Data:\n${market_sentiment}`;

      const orResp = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost:5000',
            'X-Title': process.env.OPENROUTER_TITLE || 'CrowdVerse',
          },
        }
      );

      const text = orResp.data?.choices?.[0]?.message?.content || '';
      const parts = String(text).trim().split(/\n\n+/);
      const [g = '', c = '', m = '', f = ''] = parts.map((s) => s.replace(/^.*?:\s*/i, ''));
      return sendAndCache({
        global_news_summary: g,
        user_comments_summary: c,
        market_sentiment_summary: m,
        final_summary: f,
      });
    } catch (err) {
      console.error('OpenRouter (preferred) error:', err?.response?.data || err.message || err);
      // fall through to other providers
    }
  }
  // Prefer Hugging Face free Inference API if configured
  if (HF_KEY) {
    try {
      const prompt = `Summarize information about ${asset_name} into four short sections with headers exactly in this order: Global News Summary, Community Comments Summary, Market Sentiment Summary, Final Takeaway. Keep it concise. If no recent news headlines are provided, use older but relevant widely-known events or market context; do not say news is unavailable.\n\nRecent News Headlines:\n${recent_news.join('\n')}\n\nUser Comments:\n${recent_comments.join('\n')}\n\nMarket Sentiment Data:\n${market_sentiment}`;

      // T5 expects an instruction style input
      const input = `summarize: ${prompt}`;
      const hfResp = await axios.post(
        `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(HF_MODEL)}`,
        { inputs: input, parameters: { max_new_tokens: 320, temperature: 0.3 } },
        { headers: { Authorization: `Bearer ${HF_KEY}` } }
      );

      const output = Array.isArray(hfResp.data)
        ? hfResp.data[0]?.generated_text || hfResp.data[0]?.summary_text || ''
        : hfResp.data?.generated_text || hfResp.data?.summary_text || '';

      const text = String(output || '').trim();
      const parts = text.split(/\n\n+/);
      const [g = '', c = '', m = '', f = ''] = parts.map((s) => s.replace(/^.*?:\s*/i, ''));
      return res.json({
        global_news_summary: g,
        user_comments_summary: c,
        market_sentiment_summary: m,
        final_summary: f,
      });
    } catch (err) {
      const code = err?.response?.status;
      if (code === 503) {
        return sendAndCache({
          global_news_summary: 'Model is warming up on Hugging Face free tier. Please wait a few seconds and retry.',
          user_comments_summary: '—',
          market_sentiment_summary: '—',
          final_summary: '—',
        });
      }
      console.error('HF summary error:', err?.response?.data || err.message || err);
      // fall through to OpenAI or default
    }
  }

  // Fallback to OpenAI if available
  // Try OpenRouter first if configured
  if (OPENROUTER_API_KEY) {
    try {
      const prompt = `You are a financial research assistant. Summarize the following information about ${asset_name} into four concise sections with headers exactly in this order: Global News Summary, Community Comments Summary, Market Sentiment Summary, Final Takeaway. Keep each section short. If no recent news headlines are provided, use older but relevant widely-known events or market context; do not say news is unavailable.\n\nRecent News Headlines:\n${recent_news.join('\n')}\n\nUser Comments:\n${recent_comments.join('\n')}\n\nMarket Sentiment Data:\n${market_sentiment}`;

      const orResp = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost:5000',
            'X-Title': process.env.OPENROUTER_TITLE || 'CrowdVerse',
          },
        }
      );

      const text = orResp.data?.choices?.[0]?.message?.content || '';
      const parts = String(text).trim().split(/\n\n+/);
      const [g = '', c = '', m = '', f = ''] = parts.map((s) => s.replace(/^.*?:\s*/i, ''));
      return res.json({
        global_news_summary: g,
        user_comments_summary: c,
        market_sentiment_summary: m,
        final_summary: f,
      });
    } catch (err) {
      console.error('OpenRouter summary error:', err?.response?.data || err.message || err);
      // fall through to OpenAI
    }
  }

  // Fallback to OpenAI if available
  if (openai) {
    try {
      const prompt = `You are a financial research assistant. Summarize the following information about ${asset_name} into four concise paragraphs separated by \n\n with headers: Global News Summary, Community Comments Summary, Market Sentiment Summary, Final Takeaway. If no recent news headlines are provided, use older but relevant widely-known events or market context; do not say news is unavailable.\n\nRecent News Headlines:\n${recent_news.join('\n')}\n\nUser Comments:\n${recent_comments.join('\n')}\n\nMarket Sentiment Data:\n${market_sentiment}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const text = completion.choices?.[0]?.message?.content || '';
      const [g, c, m, f] = text.split(/\n\n/).map((s) => s.replace(/^.*?:\s*/i, ''));
      return sendAndCache({
        global_news_summary: g || '',
        user_comments_summary: c || '',
        market_sentiment_summary: m || '',
        final_summary: f || '',
      });
    } catch (err) {
      console.error('OpenAI summary error:', err?.response?.data || err.message || err);
    }
  }

  // If no providers configured
  return sendAndCache({
    global_news_summary: 'AI provider not configured. Add a free HUGGINGFACE_API_KEY to enable summaries.',
    user_comments_summary: '—',
    market_sentiment_summary: '—',
    final_summary: '—',
  });
});

// GET /api/ai-summary/intelligence/:asset - Get intelligence panel data from database
router.get('/intelligence/:asset', async (req, res) => {
  try {
    const asset = req.params.asset;
    const assetUpper = asset.toUpperCase();
    console.log(`🔍 [API] Looking up intelligence data for asset: ${asset} (as ${assetUpper})`);
    
    // Map asset names/symbols to full database symbols
    let fullSymbol = assetUpper;
    
    // Check if it's a crypto name (like "Ethereum", "Bitcoin") or short symbol (like "ETH", "BTC")
    const cryptoAsset = cryptoAssets.find(c => 
      c.name.toUpperCase() === assetUpper || 
      c.short.toUpperCase() === assetUpper ||
      c.symbol.toUpperCase() === assetUpper
    );
    
    if (cryptoAsset) {
      // For crypto assets, use the short symbol (BTC, ETH) as that's how we stored it
      fullSymbol = cryptoAsset.short || cryptoAsset.symbol.split(':')[1];
      console.log(`🔍 [API] Found crypto asset: ${cryptoAsset.name} -> ${fullSymbol}`);
    } else {
      // If not found in crypto assets, check if it's a stock
      const stockAsset = stockAssets.find(s => 
        s.symbol.toUpperCase() === assetUpper ||
        s.name.toUpperCase() === assetUpper
      );
      
      if (stockAsset) {
        fullSymbol = stockAsset.symbol; // Use stock symbol like "RELIANCE"
        console.log(`🔍 [API] Found stock asset: ${stockAsset.name} -> ${fullSymbol}`);
      } else {
        console.log(`🔍 [API] Asset ${assetUpper} not found in crypto or stock assets, using as-is`);
      }
    }
    
    console.log(`🔍 [API] Mapped ${assetUpper} to ${fullSymbol}`);
    
    // Query database for intelligence data
    const intelligenceData = await Intelligence.findOne({ 
      asset: fullSymbol,
      expires_at: { $gt: new Date() } // Only return non-expired data
    });
    
    if (intelligenceData) {
      console.log(`✅ [API] Found database data for ${asset} (${fullSymbol})`);
      return res.json({
        global_news_summary: intelligenceData.global_news_summary,
        user_comments_summary: intelligenceData.user_comments_summary,
        market_sentiment_summary: intelligenceData.market_sentiment_summary,
        final_summary: intelligenceData.final_summary,
        generated_at: intelligenceData.generated_at,
        data_points: intelligenceData.data_points,
        analysis_provider: intelligenceData.analysis_provider
      });
    }

    console.log(`⚠️ [API] No database data found for ${asset} (${fullSymbol}), returning fallback`);
    console.log(`🔍 [API] Database connection status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
    
    // Return fallback data if no database data exists
    return res.json({
      global_news_summary: `No major news headlines specifically affecting ${asset} in the last 24 hours.`,
      user_comments_summary: `Community commentary is limited for ${asset}. Treat sentiment signals cautiously.`,
      market_sentiment_summary: `Market sentiment data is currently unavailable for ${asset}. Monitor price action and volume.`,
      final_summary: `Overall, build a plan for ${asset}: define invalidation levels, position sizing, and news triggers.`,
      generated_at: new Date().toISOString(),
      data_points: {
        comments_count: 0,
        sentiment_votes: 0,
        trade_votes: 0,
        bullish_percent: 50,
        buy_percent: 33.3
      }
    });
  } catch (error) {
    console.error(`❌ [API] Error fetching intelligence data for ${req.params.asset}:`, error.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch intelligence data'
    });
  }
});

module.exports = router;
