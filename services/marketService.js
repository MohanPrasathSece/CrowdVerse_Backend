const axios = require('axios');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');

const CACHE_TTL_MINUTES = Number(process.env.MARKET_CACHE_TTL_MINUTES || 60);
const STOCK_CACHE_TTL_MINUTES = Number(process.env.STOCK_CACHE_TTL_MINUTES || 60); // default 1 hour
const TWELVEDATA_QUOTE_URL = 'https://api.twelvedata.com/quote';
const TWELVEDATA_BATCH_SIZE = Number(process.env.TWELVEDATA_BATCH_SIZE || 8);

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

const ensureTwelveDataToken = () => {
  const token = process.env.TWELVEDATA_API_KEY;
  if (!token) {
    throw new Error('TWELVEDATA_API_KEY not configured');
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
  if (typeof message === 'string' && message.toLowerCase().includes('limit')) {
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

const handleTwelveDataError = (error) => {
  const payload = error?.response?.data;
  const message = payload?.message || error?.message || 'Twelve Data request failed';

  if (payload?.code === 429 || (typeof message === 'string' && message.toLowerCase().includes('limit'))) {
    const limitError = new Error('TWELVEDATA_LIMIT');
    limitError.details = message;
    throw limitError;
  }

  const err = new Error(message);
  err.details = payload || message;
  throw err;
};

const chunkSymbols = (symbols, size) => {
  const buckets = [];
  for (let i = 0; i < symbols.length; i += size) {
    buckets.push(symbols.slice(i, i + size));
  }
  return buckets;
};

const fetchTwelveDataQuotesForAssets = async (assets, resolveSymbol, mapResult) => {
  const token = ensureTwelveDataToken();
  const symbols = assets
    .map((asset) => resolveSymbol(asset))
    .filter(Boolean);

  if (!symbols.length) {
    return [];
  }

  try {
    const resultMap = new Map();

    for (const batch of chunkSymbols(symbols, TWELVEDATA_BATCH_SIZE)) {
      const { data } = await axios.get(TWELVEDATA_QUOTE_URL, {
        params: {
          symbol: batch.join(','),
          apikey: token,
        },
      });

      if (!data || typeof data !== 'object') {
        const err = new Error('TWELVEDATA_FETCH_FAILED');
        err.details = data;
        throw err;
      }

      if (data.code || data.status === 'error') {
        const err = new Error('TWELVEDATA_FETCH_FAILED');
        err.details = data.message || data;
        throw err;
      }

      const mapFromResponse = () => {
        if (Array.isArray(data)) {
          return new Map(data.map((entry) => [entry.symbol, entry]));
        }

        if (batch.length === 1 && data.symbol) {
          return new Map([[data.symbol, data]]);
        }

        return new Map(
          Object.entries(data)
            .filter(([key, value]) => key !== 'status' && value && typeof value === 'object' && !value.code)
            .map(([key, value]) => [value.symbol || key, value])
        );
      };

      const batchMap = mapFromResponse();
      batchMap.forEach((value, key) => {
        if (!resultMap.has(key)) {
          resultMap.set(key, value);
        }
      });
    }

    const toNumber = (value) => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return assets.map((asset, index) => {
      const symbol = resolveSymbol(asset);
      const quote = resultMap.get(symbol) || resultMap.get(symbol?.toUpperCase()) || resultMap.get(symbol?.toLowerCase());

      if (!quote) {
        return mapResult(asset, index, {
          price: null,
          open: null,
          high: null,
          low: null,
          prevClose: null,
          change: null,
        });
      }

      const price = safeNumber(toNumber(quote.price));
      const open = safeNumber(toNumber(quote.open));
      const high = safeNumber(toNumber(quote.high));
      const low = safeNumber(toNumber(quote.low));
      const prevClose = safeNumber(toNumber(quote.previous_close));

      let change = safeNumber(toNumber(quote.percent_change));
      if (change === null) {
        change = safeNumber(toNumber(quote.change_percent));
      }
      if (change === null) {
        change = computeChangePct(price, prevClose);
      }

      return mapResult(asset, index, { price, open, high, low, prevClose, change });
    });
  } catch (error) {
    handleTwelveDataError(error);
  }
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

const getQuotes = async (type, assets, resolveSymbol, mapResult, fetcher, options = {}) => {
  const { force = false, ttlMinutes = CACHE_TTL_MINUTES } = options;
  const entry = cache[type];

  if (!force && isCacheValid(entry, ttlMinutes)) {
    return buildPayload(type, 'cache', ttlMinutes);
  }

  const data = await fetcher(assets, resolveSymbol, mapResult);
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
    fetchFinnhubQuotesForAssets,
    { ...options, ttlMinutes: CACHE_TTL_MINUTES }
  );

const fetchStockQuotes = (options = {}) =>
  getQuotes(
    'stock',
    stockAssets,
    (asset) => asset.twelvedataSymbol,
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
    fetchTwelveDataQuotesForAssets,
    { ...options, ttlMinutes: STOCK_CACHE_TTL_MINUTES }
  );

module.exports = {
  fetchCryptoQuotes,
  fetchStockQuotes,
};
