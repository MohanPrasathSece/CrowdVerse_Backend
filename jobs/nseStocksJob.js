const cron = require('node-cron');
const Stock = require('../models/Stock');
const { fetchNifty50 } = require('../services/nseService');

function shouldRun() {
  if (!process.env.MONGODB_URI) {
    console.warn('[NSEStocksJob] Skipping: MONGODB_URI not configured.');
    return false;
  }
  return true;
}

async function upsertStocks(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  const ops = items.map((s) => ({
    updateOne: {
      filter: { symbol: s.symbol },
      update: {
        $set: {
          name: s.name,
          sector: s.sector ?? null,
          price: s.price,
          open: s.open,
          high: s.high,
          low: s.low,
          prevClose: s.prevClose,
          change: s.change,
          marketCap: s.marketCap,
          weightage: s.weightage ?? null,
          source: 'NSE',
          updatedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  const res = await Stock.bulkWrite(ops, { ordered: false });
  return res?.nUpserted + res?.nModified || 0;
}

function startNSEStocksJob() {
  if (!shouldRun()) return;

  const schedule = process.env.NSE_STOCKS_CRON || '0 * * * *'; // hourly
  const timezone = process.env.SNAPSHOT_TZ || 'UTC';

  cron.schedule(
    schedule,
    async () => {
      try {
        console.log('[NSEStocksJob] Fetching NIFTY 50...');
        const items = await fetchNifty50();
        items.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
        const count = await upsertStocks(items);
        const topSymbols = items
          .slice(0, 10)
          .map((s, idx) => `${idx + 1}. ${s.symbol}`)
          .join(' | ');
        console.log(`[NSEStocksJob] Upserted ${count} documents. Top snapshot -> ${topSymbols}`);
      } catch (err) {
        console.error('[NSEStocksJob] Failed', err?.message || err);
      }
    },
    { timezone }
  );

  console.log(`[NSEStocksJob] Scheduled (${schedule} ${timezone})`);
}

module.exports = startNSEStocksJob;
