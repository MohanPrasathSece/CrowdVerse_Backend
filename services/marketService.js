const axios = require('axios');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');

const CACHE_TTL_MINUTES = Number(process.env.MARKET_CACHE_TTL_MINUTES || 60);
const STOCK_CACHE_TTL_MINUTES = Number(process.env.STOCK_CACHE_TTL_MINUTES || 60); // default 1 hour

const cache = {
  stock: { data: null, fetchedAt: 0 },
  crypto: { data: null, fetchedAt: 0 },
};

const ensureFinnhubToken = () => {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    throw new Error('FINNHUB_API_KEY not configured');
  }
  return token;
};

const safeNumber = (value) => (typeof value === 'number' ? value : null);

const computeChangePct = (current, previous) => {
  if (current === null || previous === null || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
};

const handleFinnhubError = (error) => {
  const message = error?.response?.data?.error || error?.message || 'Finnhub request failed';
  if (message.toLowerCase().includes('limit')) {
    const limitError = new Error('FINNHUB_LIMIT');
    limitError.details = message;
    throw limitError;
  }
  const err = new Error(message);
  err.details = message;
  throw err;
};

const fetchFinnhubQuotesForAssets = async (assets, resolveSymbol, mapResult) => {
  const token = ensureFinnhubToken();

  const results = await Promise.all(
    assets.map(async (asset, index) => {
      const symbol = resolveSymbol(asset);
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;

      try {
        const { data } = await axios.get(url);

        const price = safeNumber(data.c);
        const open = safeNumber(data.o);
        const high = safeNumber(data.h);
        const low = safeNumber(data.l);
        const prevClose = safeNumber(data.pc);
        const change = computeChangePct(price, prevClose);

        return mapResult(asset, index, { price, open, high, low, prevClose, change });
      } catch (error) {
        handleFinnhubError(error);
      }
    })
  );

  return results;
};

const isCacheValid = (entry, ttlMinutes = CACHE_TTL_MINUTES) => {
  if (!entry || !Array.isArray(entry.data) || entry.data.length === 0) return false;
  return Date.now() - entry.fetchedAt < ttlMinutes * 60 * 1000;
};

const buildPayload = (type, source, ttlOverride) => {
  const entry = cache[type] || {};
  return {
    results: entry.data || [],
    fetchedAt: entry.fetchedAt || null,
    source,
    ttlMinutes: ttlOverride ?? CACHE_TTL_MINUTES,
  };
};

const getQuotes = async (type, assets, resolveSymbol, mapResult, options = {}) => {
  const { force = false, ttlMinutes = CACHE_TTL_MINUTES } = options;
  const entry = cache[type];

  if (!force && isCacheValid(entry, ttlMinutes)) {
    return buildPayload(type, 'cache', ttlMinutes);
  }

  const data = await fetchFinnhubQuotesForAssets(assets, resolveSymbol, mapResult);
  cache[type] = {
    data,
    fetchedAt: Date.now(),
  };

  return buildPayload(type, 'fresh', ttlMinutes);
};

const fetchCryptoQuotes = (options = {}) =>
  getQuotes(
    'crypto',
    cryptoAssets,
    (asset) => asset.symbol,
    (asset, index, numbers) => ({
      rank: index + 1,
      name: asset.name,
      symbol: asset.short,
      price: numbers.price,
      open: numbers.open,
      high: numbers.high,
      low: numbers.low,
      prevClose: numbers.prevClose,
      change: numbers.change,
    }),
    { ...options, ttlMinutes: CACHE_TTL_MINUTES }
  );

const fetchStockQuotes = (options = {}) =>
  getQuotes(
    'stock',
    stockAssets,
    (asset) => asset.finnhubSymbol,
    (asset, index, numbers) => ({
      rank: index + 1,
      name: asset.name,
      symbol: asset.symbol,
      price: numbers.price,
      open: numbers.open,
      high: numbers.high,
      low: numbers.low,
      prevClose: numbers.prevClose,
      change: numbers.change,
    }),
    { ...options, ttlMinutes: STOCK_CACHE_TTL_MINUTES }
  );

module.exports = {
  fetchCryptoQuotes,
  fetchStockQuotes,
};
