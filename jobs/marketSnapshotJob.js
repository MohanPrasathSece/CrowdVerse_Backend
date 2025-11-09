const cron = require('node-cron');
const MarketSnapshot = require('../models/MarketSnapshot');
const { fetchCryptoQuotes, fetchStockQuotes } = require('../services/marketService');

const shouldRunSnapshots = () => {
  if (!process.env.MONGODB_URI) {
    console.warn('[MarketSnapshotJob] Skipping snapshot job: MONGODB_URI not configured.');
    return false;
  }
  if (!process.env.FINNHUB_API_KEY) {
    console.warn('[MarketSnapshotJob] Skipping snapshot job: FINNHUB_API_KEY not configured.');
    return false;
  }
  return true;
};

const storeSnapshots = async (assetType, quotes) => {
  if (!Array.isArray(quotes) || !quotes.length) return;

  const recordedAt = new Date();
  const payload = quotes.map((quote) => ({
    assetType,
    symbol: quote.symbol,
    name: quote.name,
    metrics: {
      price: quote.price ?? null,
      open: quote.open ?? null,
      high: quote.high ?? null,
      low: quote.low ?? null,
      prevClose: quote.prevClose ?? null,
      change: quote.change ?? null,
    },
    recordedAt,
  }));

  await MarketSnapshot.insertMany(payload);
  console.log(`[MarketSnapshotJob] Stored ${payload.length} ${assetType} snapshots at ${recordedAt.toISOString()}`);
};

const startMarketSnapshotJob = () => {
  if (!shouldRunSnapshots()) {
    return;
  }

  const schedule = process.env.SNAPSHOT_CRON || '0 * * * *';
  const timezone = process.env.SNAPSHOT_TZ || 'UTC';

  cron.schedule(
    schedule,
    async () => {
      try {
        console.log('[MarketSnapshotJob] Fetching hourly snapshots...');
        const [stocksPayload, cryptoPayload] = await Promise.all([
          fetchStockQuotes({ force: true }),
          fetchCryptoQuotes({ force: true }),
        ]);

        await storeSnapshots('stock', stocksPayload.results);
        await storeSnapshots('crypto', cryptoPayload.results);
      } catch (error) {
        console.error('[MarketSnapshotJob] Failed to capture market snapshots', error?.message || error);
      }
    },
    {
      timezone,
    }
  );

  console.log(`[MarketSnapshotJob] Scheduled hourly snapshots (${schedule} ${timezone})`);
};

module.exports = startMarketSnapshotJob;
