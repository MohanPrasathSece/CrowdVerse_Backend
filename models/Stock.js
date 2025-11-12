const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    sector: { type: String, default: null, trim: true },
    price: { type: Number, default: null },
    open: { type: Number, default: null },
    high: { type: Number, default: null },
    low: { type: Number, default: null },
    prevClose: { type: Number, default: null },
    change: { type: Number, default: null }, // percentage change
    marketCap: { type: Number, default: null },
    weightage: { type: Number, default: null },
    source: { type: String, default: 'NSE' },
    updatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Stock', stockSchema);
