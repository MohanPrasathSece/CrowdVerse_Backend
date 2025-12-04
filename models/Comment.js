const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    asset: { type: String, required: true, uppercase: true, trim: true },
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      // Can be either ObjectId (for registered users) or object (for guests)
    },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    sentiment: { type: String, enum: ['bullish', 'bearish', 'neutral'], default: null },
    sentimentConfidence: { type: Number, min: 0, max: 1, default: null },
    keyPoints: [{ type: String, trim: true }],
    category: { type: String, enum: ['technical', 'fundamental', 'news', 'general'], default: 'general' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
  },
  { timestamps: true }
);

// Add indexes for faster lookups
commentSchema.index({ asset: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
