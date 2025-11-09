const axios = require('axios');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');

const MONEYCONTROL_API_BASE = process.env.MONEYCONTROL_API_BASE || 'https://priceapi.moneycontrol.com/pricefeed/nse/equitycash';

const CACHE_TTL_MINUTES = Number(process.env.MARKET_CACHE_TTL_MINUTES || 60);
const STOCK_CACHE_TTL_MINUTES = Number(process.env.STOCK_CACHE_TTL_MINUTES || 720); // default 12 hours
const CACHE_TTL_MS = CACHE_TTL_MINUTES * 60 * 1000;
const STOCK_REFRESH_WINDOWS = (process.env.STOCK_REFRESH_WINDOWS || '10:00,15:30')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((time) => {
    const [hourStr, minuteStr] = time.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    return {
      hour: Number.isFinite(hour) ? hour : 10,
      minute: Number.isFinite(minute) ? minute : 0,
    };
  });

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

const shouldRefreshStock = (now, lastUpdated) => {
  if (!lastUpdated) return true;

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  if (lastUpdated < dayStart) {
    return true;
  }

  return STOCK_REFRESH_WINDOWS.some(({ hour, minute }) => {
    const cutoff = new Date(dayStart);
    cutoff.setHours(hour, minute, 0, 0);
    return lastUpdated < cutoff && now >= cutoff;
  });
};

const fetchStockQuotes = async (options = {}) => {
  const { force = false } = options;
  const entry = cache.stock;

  try {
    const now = new Date();
    const lastUpdated = entry?.fetchedAt ? new Date(entry.fetchedAt) : null;
    const hasValidCache = entry && Array.isArray(entry.data) && entry.data.length > 0;

    if (!force && hasValidCache && !shouldRefreshStock(now, lastUpdated)) {
      return buildPayload('stock', 'cache', STOCK_CACHE_TTL_MINUTES);
    }

    const normalized = await Promise.all(
      stockAssets.map(async (asset, index) => {
        const slug = asset.moneycontrolSlug || asset.symbol;
        const url = `${MONEYCONTROL_API_BASE.replace(/\/$/, '')}/${encodeURIComponent(slug)}`;
        try {
          const { data } = await axios.get(url, { timeout: 10000 });
          const payload = data?.data || data?.stockData;

          if (!payload) {
            const err = new Error('MONEYCONTROL_SYMBOL_FAILED');
            err.details = data || `No payload for ${slug}`;
            throw err;
          }

          const toNumber = (val) => {
            const parsed = parseFloat(val);
            return Number.isFinite(parsed) ? parsed : null;
          };

          const price = safeNumber(toNumber(payload.pricecurrent ?? payload.priceCurrent));
          const open = safeNumber(toNumber(payload.priceopen ?? payload.priceOpen));
          const high = safeNumber(toNumber(payload.high ?? payload.priceHigh));
          const low = safeNumber(toNumber(payload.low ?? payload.priceLow));
          const prevClose = safeNumber(toNumber(payload.priceprevclose ?? payload.pricePrevClose));
          const absoluteChange = safeNumber(toNumber(payload.pricechange ?? payload.priceChange));
          const changePct = safeNumber(toNumber(payload.pricepercentchange ?? payload.pricePercentChange));
          const change = changePct !== null ? changePct : computeChangePct(price, prevClose);

          return {
            rank: index + 1,
            name: payload.company ?? payload.companyName ?? asset.name,
            symbol: asset.symbol,
            slug,
            price,
            open,
            high,
            low,
            prevClose,
            change,
            absoluteChange,
            lastUpdate: payload.lastupd || payload.lastUpdate || null,
          };
        } catch (inner) {
          if (inner?.message === 'MONEYCONTROL_SYMBOL_FAILED') {
            throw inner;
          }
          const err = new Error('MONEYCONTROL_FETCH_FAILED');
          err.details = inner?.response?.data || inner?.message || inner;
          err.symbol = asset.symbol;
          throw err;
        }
      })
    );

    cache.stock = {
      data: normalized,
      fetchedAt: Date.now(),
    };

    return buildPayload('stock', 'fresh', STOCK_CACHE_TTL_MINUTES);
  } catch (error) {
    if (['MONEYCONTROL_FETCH_FAILED', 'MONEYCONTROL_SYMBOL_FAILED'].includes(error?.message)) {
      throw error;
    }
    const err = new Error('MONEYCONTROL_FETCH_FAILED');
    err.details = error?.response?.data || error?.message || error;
    throw err;
  }
};

module.exports = {
  fetchCryptoQuotes,
  fetchStockQuotes,
};
