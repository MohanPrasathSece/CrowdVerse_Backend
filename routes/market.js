const express = require('express');
const axios = require('axios');
const router = express.Router();

const { cryptoAssets, stockAssets } = require('../constants/marketAssets');
const { fetchCryptoQuotes, fetchStockQuotes } = require('../services/marketService');

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
router.get('/stocks', async (_req, res) => {
  try {
    const payload = await fetchStockQuotes();
    return res.json(payload);
  } catch (err) {
    console.error(err?.response?.data || err.message || err);
    if (err.message === 'FINNHUB_API_KEY not configured' || err.message === 'TWELVEDATA_API_KEY not configured') {
      return res.status(500).json({ message: err.message });
    }
    if (err.message === 'FINNHUB_LIMIT') {
      return res.status(429).json({ message: err.details || 'Finnhub rate limit reached' });
    }
    if (err.message === 'TWELVEDATA_LIMIT') {
      return res.status(429).json({ message: err.details || 'Twelve Data rate limit reached' });
    }
    if (err.message === 'TWELVEDATA_FETCH_FAILED') {
      return res.status(502).json({ message: 'Failed to fetch Indian equities data from Twelve Data', details: err.details });
    }
    return res.status(500).json({ message: 'Failed to fetch stock markets' });
  }
});

module.exports = router;
