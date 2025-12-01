const mongoose = require('mongoose');

const sentimentVoteSchema = new mongoose.Schema(
  {
    asset: { type: String, required: true, uppercase: true, trim: true, index: true },
    user: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true, 
      index: true 
      // Can be either ObjectId (for registered users) or string (for guests)
    },
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
