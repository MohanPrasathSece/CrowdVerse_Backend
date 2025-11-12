const express = require('express');
const axios = require('axios');
const router = express.Router();

const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const { fetchCryptoQuotes, fetchStockQuotes } = require('../services/marketService');
const Stock = require('../models/Stock');
const { fetchNifty50 } = require('../services/nseService');

// GET /api/market/quote?symbol=RELIANCE.NS
router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: 'symbol is required' });

    const token = process.env.FINNHUB_API_KEY;
    if (!token) return res.status(500).json({ message: 'FINNHUB_API_KEY not configured' });

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const { data } = await axios.get(url);
    return res.json(data);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    return res.status(500).json({ message: 'Failed to fetch quote' });
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
    // Prefer cached DB values updated hourly by NSE job
    let docs = [];
    if (!preferLive) {
      try {
        docs = await Stock.find({}).sort({ marketCap: -1 }).limit(15).lean();
      } catch (_) {}
    }

    let top = docs;
    let responseSource = 'cache';
    if (!Array.isArray(top) || top.length === 0 || preferLive) {
      // Fallback: live fetch from NSE
      const live = await fetchNifty50();
      top = live.filter((x) => x && x.symbol);
      responseSource = 'live';
    }

    top = (Array.isArray(top) ? top : [])
      .filter((item) => item && item.symbol)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 10);

    let lastUpdated = null;
    if (responseSource === 'cache' && Array.isArray(docs) && docs.length) {
      lastUpdated = docs.reduce((latest, doc) => {
        const ts = doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0;
        return ts > latest ? ts : latest;
      }, 0);
      if (lastUpdated) lastUpdated = new Date(lastUpdated).toISOString();
    }
    if (!lastUpdated) {
      lastUpdated = new Date().toISOString();
    }

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

module.exports = router;
