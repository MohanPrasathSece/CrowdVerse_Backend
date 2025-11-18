const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    asset: { type: String, required: true, uppercase: true, trim: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    sentiment: { type: String, enum: ['bullish', 'bearish', 'neutral'], default: null },
    sentimentConfidence: { type: Number, min: 0, max: 1, default: null },
    keyPoints: [{ type: String, trim: true }],
    category: { type: String, enum: ['technical', 'fundamental', 'news', 'general'], default: 'general' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
