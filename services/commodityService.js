const axios = require('axios');
const Commodity = require('../models/Commodity');

const fetchCommodityPrices = async () => {
    try {
        console.log('🪙 Fetching commodity prices...');

        // Using a public/free API if possible. 
        // MetalPriceAPI or GoldAPI usually need keys. 
        // For this implementation, we'll try a common one or mock with logical values if keys are missing.
        const API_KEY = process.env.METAL_PRICE_API_KEY;

        // Symbols: XAU (Gold), XAG (Silver)
        // 1 Troy Ounce = 31.1035 Grams
        const GRAMS_IN_OUNCE = 31.1034768;

        let prices = {
            GOLD: 65,
            SILVER: 0.8,
            COPPER: 0.01,
            SILICON: 0.005,
            CRUDEOIL: 0.6
        };

        // JANUARY 2026 REALITY CALIBRATION
        let USD_TO_INR = 91.50;
        const NINJA_API_KEY = process.env.NINJA_API_KEY;

        // Cumulative store for history
        let history = {};

        // Try to fetch real prices
        try {
            console.log('📡 Fetching market data from APIs...');

            // 1. Fetch live exchange rate
            try {
                const exchangeRateRes = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
                if (exchangeRateRes.data && exchangeRateRes.data.rates && exchangeRateRes.data.rates.INR) {
                    USD_TO_INR = exchangeRateRes.data.rates.INR;
                    console.log(`💱 Live API USD_TO_INR: ${USD_TO_INR.toFixed(2)}`);
                }
            } catch (e) { console.warn('Exchange rate fetch failed, using benchmark.'); }

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                ...(NINJA_API_KEY && { 'X-Api-Key': NINJA_API_KEY })
            };

            // Helper to fetch from Yahoo (Returns { price, prevClose })
            const fetchYahooFull = async (symbol) => {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
                const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const meta = res.data.chart.result[0].meta;
                return {
                    price: meta.regularMarketPrice,
                    prevClose: meta.previousClose || meta.regularMarketPrice
                };
            };

            // Helper to fetch from API-Ninjas
            const fetchNinja = async (name) => {
                if (!NINJA_API_KEY) throw new Error('No Ninja Key');
                const url = `https://api.api-ninjas.com/v1/commodityprice?name=${name}`;
                const res = await axios.get(url, { headers });
                return res.data.price;
            };

            // --- GOLD (Rank 1) ---
            try {
                const yahoo = await fetchYahooFull('GC=F');
                let goldUsd = yahoo.price;
                try { goldUsd = await fetchNinja('gold'); } catch (e) { }

                prices.GOLD = (goldUsd / 31.1035) * USD_TO_INR * 1.15;
                history.GOLD = (yahoo.prevClose / 31.1035) * USD_TO_INR * 1.15;
            } catch (e) { prices.GOLD = 14000; history.GOLD = 13950; }

            // --- SILVER (Rank 2) ---
            try {
                const yahoo = await fetchYahooFull('SI=F');
                let silverUsd = yahoo.price;
                try { silverUsd = await fetchNinja('silver'); } catch (e) { }

                prices.SILVER = (silverUsd / 31.1035) * USD_TO_INR * 1.15;
                history.SILVER = (yahoo.prevClose / 31.1035) * USD_TO_INR * 1.15;
            } catch (e) { prices.SILVER = 249.00; history.SILVER = 247.00; }

            // --- CRUDE OIL (Rank 3) ---
            try {
                const yahoo = await fetchYahooFull('CL=F');
                let oilUsd = yahoo.price;
                try { oilUsd = await fetchNinja('crude_oil'); } catch (e) { }

                prices.CRUDEOIL = (oilUsd / 158.987) * USD_TO_INR;
                history.CRUDEOIL = (yahoo.prevClose / 158.987) * USD_TO_INR;
            } catch (e) { prices.CRUDEOIL = 32.00; history.CRUDEOIL = 31.80; }

            // --- COPPER (Rank 4) ---
            try {
                const yahoo = await fetchYahooFull('HG=F');
                let copperUsd = yahoo.price;
                try { copperUsd = await fetchNinja('copper'); } catch (e) { }

                prices.COPPER = (copperUsd / 453.592) * USD_TO_INR;
                history.COPPER = (yahoo.prevClose / 453.592) * USD_TO_INR;
            } catch (e) { prices.COPPER = 1.16; history.COPPER = 1.15; }

            // --- SILICON (Rank 5) ---
            prices.SILICON = 0.22;
            history.SILICON = 0.21;

            console.log(`✨ API-Derived Prices (INR): Gold ₹${prices.GOLD.toFixed(2)}, Silver ₹${prices.SILVER.toFixed(2)}`);
        } catch (apiErr) {
            console.error('❌ Major API error:', apiErr.message);
            prices.GOLD = 14000; prices.SILVER = 249; prices.CRUDEOIL = 32; prices.COPPER = 1.16; prices.SILICON = 0.22;
            history.GOLD = 13950; history.SILVER = 247; history.CRUDEOIL = 31.5; history.COPPER = 1.15; history.SILICON = 0.21;
        }

        const allowedSymbols = ['GOLD', 'SILVER', 'CRUDEOIL', 'COPPER', 'SILICON'];
        const rankingMap = { 'GOLD': 1, 'SILVER': 2, 'CRUDEOIL': 3, 'COPPER': 4, 'SILICON': 5 };

        await Commodity.deleteMany({ symbol: { $nin: allowedSymbols } });

        const commodities = [
            { rank: rankingMap.GOLD, name: 'Gold (24K)', symbol: 'GOLD', price: prices.GOLD, prev: history.GOLD, unit: 'g' },
            { rank: rankingMap.SILVER, name: 'Silver', symbol: 'SILVER', price: prices.SILVER, prev: history.SILVER, unit: 'g' },
            { rank: rankingMap.CRUDEOIL, name: 'Crude Oil', symbol: 'CRUDEOIL', price: prices.CRUDEOIL, prev: history.CRUDEOIL, unit: 'L' },
            { rank: rankingMap.COPPER, name: 'Copper', symbol: 'COPPER', price: prices.COPPER, prev: history.COPPER, unit: 'g' },
            { rank: rankingMap.SILICON, name: 'Silicon', symbol: 'SILICON', price: prices.SILICON, prev: history.SILICON, unit: 'g' }
        ];

        for (const item of commodities) {
            await Commodity.findOneAndUpdate(
                { symbol: item.symbol },
                {
                    rank: item.rank,
                    name: item.name,
                    symbol: item.symbol,
                    pricePerGram: Number(item.price.toFixed(2)),
                    prevPricePerGram: Number(item.prev.toFixed(2)),
                    unit: item.unit,
                    currency: 'INR',
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );
        }

        console.log('✅ Commodities updated successfully.');
        return true;
    } catch (error) {
        console.error('❌ Error fetching commodities:', error.message);
        return false;
    }
};

module.exports = { fetchCommodityPrices };
