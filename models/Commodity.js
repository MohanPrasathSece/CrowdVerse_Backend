const mongoose = require('mongoose');

const commoditySchema = new mongoose.Schema(
    {
        rank: { type: Number, required: true },
        name: { type: String, required: true },
        symbol: { type: String, required: true, uppercase: true },
        pricePerGram: { type: Number, required: true },
        prevPricePerGram: { type: Number },
        unit: { type: String, default: 'g' },
        currency: { type: String, default: 'INR' },
        lastUpdated: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Commodity', commoditySchema);
