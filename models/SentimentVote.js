const mongoose = require('mongoose');

const sentimentVoteSchema = new mongoose.Schema(
  {
    asset: { type: String, required: true, uppercase: true, trim: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sentiment: {
      type: String,
      enum: ['bullish', 'bearish'],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// 1 vote per user per asset
sentimentVoteSchema.index({ asset: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('SentimentVote', sentimentVoteSchema);
