const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        summary: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        source: { type: String, default: 'Aggregated' },
        url: { type: String },
        imageUrl: { type: String },
        publishedAt: { type: Date, default: Date.now },
        category: { type: String, enum: ['Crypto', 'Stocks', 'Politics', 'General'], required: true },
        sentiment: { type: String, enum: ['bullish', 'bearish', 'neutral'], default: 'neutral' },
        weekId: { type: String, required: true, index: true } // To group news by week (e.g., "2024-W48")
    },
    { timestamps: true }
);

module.exports = mongoose.model('News', newsSchema);
