const mongoose = require('mongoose');

const intelligenceSchema = new mongoose.Schema({
  asset: { 
    type: String, 
    required: true, 
    uppercase: true, 
    trim: true, 
    index: true 
  },
  assetType: {
    type: String,
    enum: ['stock', 'crypto'],
    required: true
  },
  global_news_summary: {
    type: String,
    required: true,
    trim: true
  },
  user_comments_summary: {
    type: String,
    required: true,
    trim: true
  },
  market_sentiment_summary: {
    type: String,
    required: true,
    trim: true
  },
  final_summary: {
    type: String,
    required: true,
    trim: true
  },
  data_points: {
    comments_count: { type: Number, default: 0 },
    sentiment_votes: { type: Number, default: 0 },
    trade_votes: { type: Number, default: 0 },
    bullish_percent: { type: Number, default: 0 },
    buy_percent: { type: Number, default: 0 },
    bearish_percent: { type: Number, default: 0 },
    sell_percent: { type: Number, default: 0 }
  },
  analysis_provider: {
    type: String,
    default: 'dummy'
  },
  generated_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  }
}, {
  timestamps: true
});

// Index for efficient queries
intelligenceSchema.index({ asset: 1, assetType: 1 }, { unique: true });
intelligenceSchema.index({ expires_at: 1 });

// TTL index to automatically delete expired documents
intelligenceSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Intelligence', intelligenceSchema);
