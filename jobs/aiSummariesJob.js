const cron = require('node-cron');
const axios = require('axios');

/**
 * Daily AI summaries job
 * - Fetches top stocks and crypto from our own API
 * - Triggers /api/ai-summary with refresh=true to warm the 24h cache
 */
function startAISummariesJob() {
  const CRON = process.env.AI_SUMMARY_CRON || '0 3 * * *'; // daily at 03:00
  const LIMIT = parseInt(process.env.AI_SUMMARY_LIMIT || '40', 10); // total per asset class
  const BASE = process.env.SELF_BASE_URL || `http://localhost:${process.env.SERVER_PORT || 5000}`;

  const run = async () => {
    try {
      const fetchList = async (url, mapFn) => {
        try {
          const { data } = await axios.get(`${BASE}${url}`, { timeout: 30000 });
          const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          return arr.slice(0, LIMIT).map(mapFn).filter(Boolean);
        } catch (err) {
          console.error('[AI Job] Failed to load list from', url, err?.response?.status || err.message);
          return [];
        }
      };

      const stocks = await fetchList('/api/market/stocks', (i) => (i?.symbol ? { symbol: String(i.symbol).toUpperCase(), name: i?.name || i?.symbol } : null));
      const crypto = await fetchList('/api/market/crypto', (i) => (i?.symbol ? { symbol: String(i.symbol).toUpperCase(), name: i?.name || i?.symbol } : null));

      const targets = [...stocks, ...crypto];
      console.log(`[AI Job] Preparing ${targets.length} assets for AI summaries`);

      for (let idx = 0; idx < targets.length; idx++) {
        const t = targets[idx];
        try {
          await axios.post(`${BASE}/api/ai-summary`, {
            asset_name: t.name || t.symbol,
            recent_comments: [],
            recent_news: [],
            market_sentiment: '',
            refresh: true,
          }, { timeout: 90000 });
          console.log(`[AI Job] Cached summary (${idx + 1}/${targets.length}) for ${t.symbol}`);
        } catch (err) {
          console.error(`[AI Job] Failed summary for ${t.symbol}`, err?.response?.status || err.message);
        }
        // Basic pacing to respect free provider limits
        const delayMs = parseInt(process.env.AI_SUMMARY_DELAY_MS || '1200', 10);
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }

      console.log('[AI Job] Completed AI summaries warm-up');
    } catch (err) {
      console.error('[AI Job] Unexpected error', err?.message || err);
    }
  };

  // Schedule
  cron.schedule(CRON, run, { timezone: process.env.TZ || 'UTC' });
  console.log(`[AISummariesJob] Scheduled (${CRON} ${process.env.TZ || 'UTC'})`);

  // Optional immediate run on boot
  if (String(process.env.AI_SUMMARY_RUN_ON_BOOT || 'false').toLowerCase() === 'true') {
    run();
  }
}

module.exports = startAISummariesJob;
