const cron = require('node-cron');
const { fetchCommodityPrices } = require('../services/commodityService');

// Run once a day at 12:05 AM
const commodityJob = cron.schedule('5 0 * * *', async () => {
    console.log('🕒 Running daily commodity price update...');
    await fetchCommodityPrices();
});

// Run once on startup to ensure data exists
const runCommodityJobNow = async () => {
    await fetchCommodityPrices();
};

module.exports = { commodityJob, runCommodityJobNow };
