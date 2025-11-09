const mongoose = require('mongoose');

const marketSnapshotSchema = new mongoose.Schema(
  {
    assetType: {
      type: String,
      enum: ['stock', 'crypto'],
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    metrics: {
      price: { type: Number, default: null },
      open: { type: Number, default: null },
      high: { type: Number, default: null },
      low: { type: Number, default: null },
      prevClose: { type: Number, default: null },
      change: { type: Number, default: null },
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model('MarketSnapshot', marketSnapshotSchema);
